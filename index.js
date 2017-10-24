const TTS = require('./lib/TTS');
const request = require('request-promise');

const serverHost = process.env.RANCH_SERVER || 'localhost:3000';
const apikey = process.env.RANCH_APIKEY;

const serverApi = `http://${serverHost}/api/v1`;

const getSensorList = () => request({
    uri: `${serverApi}/sensors`,
    qs: { apikey },
    json: true
});

const getLatestValue = (serial) => {
    console.log(`${serverApi}/sensor/${encodeURIComponent(serial)}/latest`);
    console.dir({ apikey });
    return request({
        uri: `${serverApi}/sensor/${encodeURIComponent(serial)}/latest`,
        qs: { apikey },
        json: true
    });
};

// TODO: use some config file
const nameMap = {
    'lroom/temp': 'Keittiössä',
    'ruuvi/temperature': 'Ulkona'
};

// TODO: language support and less hardcoded?
TTS.init()
    .then(say => {
        const now = new Date();
        const comparator = now.getMinutes() < 30 ? `yli` : `vaille`;
        const minutes = now.getMinutes() < 30 ? now.getMinutes() : 60 - now.getMinutes();
        const minutesRounded = Math.round(minutes / 5) * 5;
        const hours = now.getHours() % 12;
        say(`Kello on ${minutesRounded} ${comparator} ${hours} .`);
        getSensorList()
            .then(sensors => {
                const relevantSensors = sensors.filter(s => Object.keys(nameMap).indexOf(s.serial) !== -1);
                return Promise.all(relevantSensors.map(s => getLatestValue(s.serial)))
            })
            .then(latestValues => {
                const message = latestValues.map(s => `${nameMap[s.serial]} on ${s.value.toFixed(1)} astetta.`).join(' ');
                say(message);
            });
    });

