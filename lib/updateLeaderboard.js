import axios from 'axios';
import fs from 'fs';

// Read segments.json and komqom.json
const segments = JSON.parse(fs.readFileSync('segments.json', 'utf8'));
// const komqom = JSON.parse(fs.readFileSync('komqom.json', 'utf8'));

let leaderboards = [];
for (const segment of segments) {
    leaderboards = leaderboards.concat(await getSegmentDetails(segment.strava_id));
}
fs.writeFileSync('komqom.json', JSON.stringify(leaderboards, null, 4));

async function getSegmentDetails(id) {
    try {
        let res = await axios({
            method: 'post',
            url: `https://graphql.strava.com/`,
            data: {
                query: "query Segments($segmentIds: [Identifier!]! $leaderboardTypes: [SegmentLeaderTypeInput!]) {segments(segmentIds: $segmentIds) {metadata { name activityType climbCategory verifiedStatus } measurements { distance avgGrade elevHigh elevLow } elevationChart { url } totalAthletes totalEfforts athletePrEffort { timing { elapsedTime } activity { id } } leaderboards(leaderboardTypes: $leaderboardTypes) { leaderboardType leaderboardEfforts { athlete { id firstName lastName } activity { id } timing { elapsedTime } } } } } ",
                "variables": { "segmentIds": [id], "leaderboardTypes": ["Kom", "Qom"] },
                "operationName": "Segments"
            },
            headers: JSON.parse(process.env.STRAVA_HEADERS),
        })
        if (Object.keys(res.data).length === 0) {
            throw new Error("empty response returned")
        }

        const segment = res.data.data.segments?.[0];
        const leaderboards = [];
        for (let leaderboard of segment?.leaderboards) {
            for (let i = 0; i < leaderboard.leaderboardEfforts.length; i++) {
                const leaderboardData = {};
                leaderboardData.person_name = leaderboard.leaderboardEfforts[i].athlete.firstName + ' ' + leaderboard.leaderboardEfforts[i].athlete.lastName;
                leaderboardData.segment_name = segment.metadata.name;
                leaderboardData.timing = leaderboard.leaderboardEfforts[i].timing.elapsedTime;
                leaderboardData.leaderboard_rank = i + 1;
                leaderboardData.strava_id = id;
                leaderboardData.distance = segment.measurements.distance;
                leaderboardData.leaderboard = leaderboard.leaderboardType.toUpperCase();
                leaderboards.push(leaderboardData);
            }
        }
        return leaderboards;
    } catch (err) {
        if (err.status === 404) {
            console.log(404, id)
            return null;
        } else {
            console.log(err)
            throw err;
        }
    }
}