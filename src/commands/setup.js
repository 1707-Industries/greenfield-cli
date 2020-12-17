const {Command, flags} = require('@oclif/command')
const cli = require('cli-ux')
const config = new (require('../config'))()

class SetupCommand extends Command {
  async run() {
    cli.ux.info('Setting up greenfield-cli')
    const {flags} = this.parse(SetupCommand)
    const homesteadDirectory = await cli.ux.prompt('Where is your Laravel Homestead directory?', {
      required: false,
      default: '~/Homestead',
    })

    this.createConfigFile({
      homesteadDirectory,
    })

    cli.ux.info('Setup complete')
    cli.ux.info(`
Run the below to get started
greenfield-cli create PROJECTNAME
`
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
