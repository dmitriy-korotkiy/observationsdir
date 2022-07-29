var cli = function() {
    var yargs = require('yargs')
        .usage('Usage: $0 [command] [options]')
        .command('repeat <loc1>', 'Compute the approx. distance between IPs/URLs')
        .option('json', {
            alias: 'j',
            describe: 'Return data as json',
        })
        .command('hello dimon', 'Compute the approx. distance between IPs/URLs')
        .option('json', {
            alias: 'j',
            describe: 'Return data as json',
        })
        .example('$0', 'Get location info for your IP address')
        .example('$0 -j', 'Get location info for your IP as json')
        .example('$0 distance 8.8.8.8', 'Get distance from your IP to given IP')
        .example('$0 distance stackabuse.com google.com', 'Get the distance between two given URLs')
        .help('help')
        .alias('h', 'help')
        .epilog('Copyright 2022 Dimon Korotkij');

    var argv = yargs.argv;

    if (argv.loc1) {
       console.log(String(argv.loc1))
    } else {
        console.log(String('Hello mazafaka'))
    }
};

exports.cli = cli;