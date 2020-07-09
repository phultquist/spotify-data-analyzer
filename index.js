const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
var plotly;
fs.readFile('creds.json', 'utf8', (err, data) => {
    data = JSON.parse(data);
    plotly = require('plotly')(data.username, data.password);
    start();
})

var streams;

function start() {
    fs.readFile('spotify-data/StreamingHistory0.json', 'utf8', function (err, data) {
        streams = JSON.parse(data);
        fs.readFile('spotify-data/StreamingHistory1.json', 'utf8', function (err, data) {
            var sh1 = JSON.parse(data);
            streams = streams.concat(sh1);

            streams = streams.map(stream => {
                var date = stream.date = new Date(stream.endTime);
                stream.weekday = date.getDay();
                stream.dom = date.getDate();
                stream.seconds = stream.msPlayed / 1000;
                stream.month = date.getMonth();
                stream.year = date.getFullYear();
                return stream;
            })

            analyze(streams);
        })
    })
}

function analyze(s) {
    monthVstreams(s);
    monthVArtist(s, 'Kanye West');
    topArtists(s);
    artistsOverTime(s);
}

function artistsOverTime(s) {
    let artists = groupByArtist(s);
    // var raw = [{ x: x, y: y, type: 'bar' }];
    var raw = [];

    artists = artists.splice(0, 10);

    artists.forEach(a => {
        let x = [],
            y = []

        let byMonth = groupByMonth(a.streams);
        
        
        byMonth.forEach(mo => {
            x.push(mo.monthNumber);
            y.push(mo.streams.length);
        })
        
        raw.push({x: x, y: y, type: 'line', name: a.artist});
    });

    var layout = {
        fileopt: "overwrite",
        filename: "Artists in the past year",
        layout: {
            xaxis: {
                title: 'Month'
            },
            yaxis: {
                title: 'Number of Streams'
            }
        }
    };

    plotly.plot(raw, layout, function (err, msg) {
        console.log(msg);
    });
}

function topArtists(s) {
    let artists = groupByArtist(s);
    let x = [],
        y = [];

    artists.slice(0, 10).reverse().forEach(a => {
        x.push(a.artist);
        y.push(a.n);
    });

    var raw = [{ x: x, y: y, type: 'bar' }];
    var layout = {
        fileopt: "overwrite",
        filename: "Top Artists in the past year",
        layout: {
            xaxis: {
                title: 'Artist'
            },
            yaxis: {
                title: 'Number of Streams'
            }
        }
    };

    plotly.plot(raw, layout, function (err, msg) {
        console.log(msg);
    });
}

function monthVArtist(s, artistname) {
    let byMonth = groupByMonth(s);
    let x = byMonth.map(a => `${a.month + 1}/${a.year}`);
    let y = byMonth.map(mData => {
        let nKanye = 0;
        mData.streams.forEach(stream => {
            (stream.artistName == artistname) ? (nKanye++) : null;
        })
        return 100 * nKanye / mData.streams.length;
    });

    var raw = [{ x: x, y: y, type: 'line' }];
    var layout = {
        fileopt: "overwrite",
        filename: "Month by % Kanye",
        layout: {
            xaxis: {
                title: 'Month'
            },
            yaxis: {
                title: '% Kanye'
            }
        }
    };

    plotly.plot(raw, layout, function (err, msg) {
        console.log(msg);
    });
}

function monthVstreams(s) {
    //x axis: month
    //y axis: number of streams
    let byMonth = groupByMonth(s);

    let x = byMonth.map(a => `${a.month + 1}/${a.year}`);
    let y = byMonth.map(a => a.streams.length);

    var raw = [{ x: x, y: y, type: 'bar' }];
    var layout = {
        fileopt: "overwrite",
        filename: "Month by Number of Streams",
        layout: {
            xaxis: {
                title: 'Month'
            },
            yaxis: {
                title: 'Number of Streams'
            }
        }
    };

    plotly.plot(raw, layout, function (err, msg) {
        console.log(msg);
    });
}

function groupByMonth(s) {
    // console.log(s);
    let byMonth = [];
    let pMonth = 0,
        pYear = 0;

    s.forEach((stream, i) => {
        if ((stream.month > pMonth && stream.year >= pYear) || (pMonth == 11 && stream.month == 0) || (i == 0)) {
            //new month
            byMonth.push({
                month: stream.month,
                year: stream.year,
                streams: [stream],
                monthNumber: stream.month - 6 + (stream.year - 2019) * 12
            })
        } else {
            //old month         
            // console.log(byMonth);
               
            byMonth[byMonth.length - 1].streams.push(stream);
        }
        pMonth = stream.month;
        pYear = stream.year;
    });
    return byMonth
}

function groupByArtist(s) {
    let artists = [],
        ind;
    s.forEach(stream => {
        let filtered = artists.filter((a, i) => {
            if (a.artist == stream.artistName) {
                ind = i;
                return true;
            }
            return false;
        })

        if (filtered.length == 0) {
            artists.push({
                artist: stream.artistName,
                n: 1,
                streams: [stream]
            })
        } else {
            artists[ind].n++;
            artists[ind].streams.push(stream);
        }
    });

    artists = artists.sort((a, b) => {
        return (a.n < b.n) ? 1 : -1
    })

    return artists
}