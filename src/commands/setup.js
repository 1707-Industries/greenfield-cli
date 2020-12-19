const {Command} = require('@oclif/command')
const path = require('path')
const cli = require('cli-ux')
const config = new (require('../config'))()
const homeDirectory = require('os').homedir()

class SetupCommand extends Command {
  async run() {
    cli.ux.info('Setting up greenfield-cli')
    const homesteadDirectory = await cli.ux.prompt('Where is your Laravel Homestead directory?', {
      required: false,
      default: path.join(homeDirectory, 'Homestead'),
    })

    this.createConfigFile({
      homesteadDirectory,
    })

    cli.ux.info('Setup complete')
    cli.ux.info(`
Run the below to get started
greenfield-cli create PROJECTNAME
`,
    )
  }

  createConfigFile(data) {
    config.create({
      homesteadDirectory: data.homesteadDirectory,
    })
  }
}

SetupCommand.description = 'Sets greenfield-cli up. Should only be run once.'

module.exports = SetupCommand
