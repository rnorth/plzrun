#!/usr/bin/env node
const { spawn } = require("child_process");
const chalk = require('chalk');

const defaults = {
    retries: 2,
    sleep: 0,    
}

function usage() {
    console.log(`
Usage: plzrun [options] COMMAND

A tool for supervising and retrying command line executions. Runs something until it succeeds.

Options:
  -r, --retries number          How many times to retry the command if it fails (default: ${defaults.retries})
  -s, --sleep number            How long to wait in between executions (in seconds, default: ${defaults.sleep})
  -h, --help                    Display this message
  -v, --version                 Display version information
`);
    process.exit(0);
}

function version() {
    const packageJson = require('./package.json');
    console.log(packageJson.version);
    process.exit(0);
}

main();

async function main() {
    const args = parseArgs(process.argv);

    const shell = process.env.SHELL;
    const stdio = "inherit";

    let tries = 0;
    let lastExitCode = 0;
    
    while (true) {
        tries++;
        
        console.log(`Run ${chalk.bold(tries)}/${chalk.bold(1 + args.retries)} using ${shell}: ${chalk.bold(args.command)}`);
        const { code, signal } = await spawnWithPromise(args.command, { shell, stdio });
        
        lastExitCode = code;
        if (signal === "SIGINT") {
            console.log(chalk.blue("Terminated by SIGINT (Ctrl-C)"));
            process.exit(code);
        }
        
        if (code === 0) {
            console.log(chalk.green("Exited with success (exit code 0)"));
            process.exit(0);
        }

        if (signal) {
            console.log(chalk.yellow(`Exited with code ${code} (${signal})`));
        } else {
            console.log(chalk.yellow(`Exited with code ${code}`));
        }
        
        if (tries > args.retries && args.retries != -1) {
            console.log(chalk.red(`Retry limit hit - aborting`));
            process.exit(lastExitCode);
        }
        
        if (args.sleep > 0) {
            console.log(`Pausing for ${chalk.bold(args.sleep)}s between executions`);
            await sleep(args.sleep);
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
            default:
                command.push(arg)
                break;
        }
    }
    parsed.command = command.join(" ");
    
    return parsed;
}