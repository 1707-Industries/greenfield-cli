base-cli
========

Base CLI for creating new web applications

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/base-cli.svg)](https://npmjs.org/package/base-cli)
[![CircleCI](https://circleci.com/gh/Johnathan/base-cli/tree/master.svg?style=shield)](https://circleci.com/gh/Johnathan/base-cli/tree/master)
[![Codecov](https://codecov.io/gh/Johnathan/base-cli/branch/master/graph/badge.svg)](https://codecov.io/gh/Johnathan/base-cli)
[![Downloads/week](https://img.shields.io/npm/dw/base-cli.svg)](https://npmjs.org/package/base-cli)
[![License](https://img.shields.io/npm/l/base-cli.svg)](https://github.com/Johnathan/base-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g base-cli
$ base-cli COMMAND
running command...
$ base-cli (-v|--version|version)
base-cli/0.0.0 darwin-x64 node-v15.0.0
$ base-cli --help [COMMAND]
USAGE
  $ base-cli COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`base-cli hello`](#base-cli-hello)
* [`base-cli help [COMMAND]`](#base-cli-help-command)

## `base-cli hello`

Describe the command here

```
USAGE
  $ base-cli hello

OPTIONS
  -n, --name=name  name to print

DESCRIPTION
  ...
  Extra documentation goes here
```

_See code: [src/commands/setup.js](https://github.com/Johnathan/base-cli/blob/v0.0.0/src/commands/hello.js)_

## `base-cli help [COMMAND]`

display help for base-cli

```
USAGE
  $ base-cli help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.0/src/commands/help.ts)_
<!-- commandsstop -->
