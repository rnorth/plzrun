# plzrun

> A tool for supervising and retrying command line executions. Runs something until it succeeds.

## Usage

```
Usage: plzrun [options] COMMAND

A tool for supervising and retrying command line executions. Runs something until it succeeds.

Options:
  -r, --retries number          How many times to retry the command if it fails (-1 is infinite tries, default: -1)
  -s, --sleep number            How long to wait in between executions (in seconds, default: 0)
  -e, --exponential             Apply exponential backoff to sleep durations (using exponent 1.5). If a sleep duration is not set, use of -e will apply an automatic base sleep duration of 1s.
  -h, --help                    Display help
  -v, --version                 Display version information
```

## Copyright and Licence

[Apache Licence-v2.0](https://www.apache.org/licenses/LICENSE-2.0)

(c) Richard North 2018