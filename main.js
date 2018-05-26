#!/usr/bin/env node
const { spawn } = require("child_process");
const chalk = require('chalk');

const defaults = {
    retries: -1,
    sleep: 0,
    exponential: false,
    clear: false
}

const usageText = `
Usage: plzrun [options] COMMAND

A tool for supervising and retrying command line executions. Runs something until it succeeds.

Options:
-r, --retries number          How many times to retry the command if it fails (-1 is infinite tries, default: -1)
-s, --sleep number            How long to wait in between executions (in seconds, default: 0)
-e, --exponential             Apply exponential backoff to sleep durations (using exponent 1.5). 
                                If a sleep duration is not set, use of -e will apply an automatic 
                                base sleep duration of 1s.
-c, --clear                   Behave in a semi watch-like manner, resetting the terminal in between 
                                executions. In contrast to watch(1), all output will remain visible 
                                in scrollback and the screen will not be cleared at exit.
-h, --help                    Display help
-v, --version                 Display version information
`;

main();

async function main() {
    const args = parseArgs(process.argv);
    
    const shell = process.env.SHELL;
    const stdio = "inherit";
    
    let tries = 0;
    let lastExitCode = 0;
    let sleepMultiplier = 1;
    let maxTries;
    if (args.retries === -1) {
        maxTries = "∞";
    } else {
        maxTries = args.retries + 1;
    }

    
    while (true) {
        tries++;
        
        if (args.clear) {
            process.stdout.write("\033[2J\033[H");
        }

        logNote(`Run ${chalk.bold(tries)}/${chalk.bold(maxTries)} using ${shell}: ${chalk.bold(args.command)}`);
        const { code, signal } = await spawnWithPromise(args.command, { shell, stdio });
        
        lastExitCode = code;
        if (signal === "SIGINT") {
            logInfo(`Terminated by SIGINT (Ctrl-C)`);
            process.exit(code);
        }
        
        if (code === 0) {
            logSuccess(`Exited with success (exit code 0)`);
            process.exit(0);
        }
        
        if (signal) {
            logWarn(`Exited with code ${code} (${signal})`);
        } else {
            logWarn(`Exited with code ${code}`);
        }
        
        if (tries > args.retries && args.retries != -1) {
            logError(`Retry limit hit - aborting`);
            process.exit(lastExitCode);
        }
        
        if (args.sleep > 0) {
            let duration = Math.ceil(args.sleep * sleepMultiplier);
            logNote(`Pausing for ${chalk.bold(duration)}s between executions`);
            await sleep(duration);
        }

        if (args.exponential) {
            sleepMultiplier *= 1.5;
        }
    }
}

async function spawnWithPromise(command, opts) {
    return new Promise(resolve => {
        const p = spawn(command, opts);
        
        p.on("exit", (code, signal) => {
            resolve({ code, signal });
        });
    });
}

async function sleep(duration) {
    return new Promise(resolve => setTimeout(resolve, duration * 1000));
}

function parseArgs(argv) {
    argv.shift();
    argv.shift();
    
    const parsed = defaults;
    
    if (argv.length === 0) {
        usage();
    }
    
    const command = [];
    while (argv.length > 0) {
        const arg = argv.shift();
        switch (arg) {
            case "--help":
            case "-h":
                usage();
                break;
            case "--version":
            case "-v":
                version();
                break;
            case "--retries":
            case "-r":
                parsed.retries = parseInt(argv.shift());
                break;
            case "--sleep":
            case "-s":
                parsed.sleep = parseInt(argv.shift());
                break;
            case "--exponential":
            case "-e":
                parsed.exponential = true;
                parsed.sleep = parsed.sleep || 1;
                break;
            case "--clear":
            case "-c":
                parsed.clear = true;
                break;
            default:
                command.push(arg)
                break;
        }
    }
    parsed.command = command.join(" ");
    
    return parsed;
}

function usage() {
    console.log(usageText);
    process.exit(0);
}

function version() {
    const packageJson = require('./package.json');
    console.log(packageJson.version);
    process.exit(0);
}

function time() {
    return chalk.dim(new Date().toLocaleTimeString() + ":");
}
function logSuccess(message) {
    console.log(chalk.green(`${time()} ${message}`));
}
function logWarn(message) {
    console.log(chalk.yellow(`${time()} ${message}`));
}
function logError(message) {
    console.log(chalk.red(`${time()} ${message}`));
}
function logInfo(message) {
    console.log(chalk.blue(`${time()} ${message}`));
}
function logNote(message) {
    console.log(`${time()} ${message}`);
}
