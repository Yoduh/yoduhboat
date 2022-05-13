const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');

const downloadAndConvertVideo = ({
  title,
  videoUrl,
  startTime,
  duration,
  volume,
  filePath,
  format
}) =>
  new Promise((resolve, reject) =>
    ffmpeg(ytdl(videoUrl, {filter: 'audioonly'}))
        .audioFilters([{ filter: 'volume', options: volume }])
        .toFormat(`${format}`)
        .setStartTime(startTime)
        .duration(duration + .1) // adding 100ms seems to prevent slight premature cutoff
        .on('error', (err) => reject(err))
        .on('end', () => resolve(`${filePath}/${title}.${format}`))
        .saveToFile(`${filePath}/${title}.${format}`));


const mergeParams = (videoInfo, params, filePath) => ({
  title: params.title ?? videoInfo.videoDetails.title,
  videoUrl: videoInfo.videoDetails.video_url,
  startTime: params.startTime ?? '00:00:00',
  duration: params.duration ?? videoInfo.videoDetails.lengthSeconds,
  volume: params.volume ?? 1,
  filePath: filePath ?? __dirname,
  format: params.format ?? 'opus'
});
const COOKIE = 'YSC=RnxgWI6I3-I; VISITOR_INFO1_LIVE=zQ6Xq5z4Mm4; __Secure-3PSID=JQhZWMa7E7fjJFlYuGLO44kOoZdLxA-FLSAdcZzWferpSTwa4DOmjvPh9AcDqcj53cKDBg.; __Secure-3PAPISID=r2UBd9QV57unuHr7/AIZPQic5cceWTPsCN; LOGIN_INFO=AFmmF2swRQIhANz4ah0FgiaNFScwfJOWVV5BWZGdGWzzQoeCQzlGilKBAiAuztNeXZKShIb8lDAJ-6M68udWjr_eNrCNhQfn3_KzOA:QUQ3MjNmeXlHN0NPeklFZ0VmVXlFMGNwSS1LZUxzVXFfMmV0ckYxR01WWDBUYXR6YUhqcDhMTHpsTW01cXBvYWdZdGlhdmhyWmxZTGg4ejg1QUpZbTVDelV4ZGhsdk1HdGQ4ZFlYYkdfX0R5dXhZMnR5TEg2TDZGek9oWktkNTdHcFhzUXBvdTE1bHZINWhsR1NwZm9uSkJNbVlKLWdScTlFWlZ5UFpJU0M5UV9wRzMxMk5WVmI2aGptVWdKZmh1Z21mcTUyYWhsQy02T0J6dU5BNktxXy12SXQ3MUhqVi1rQQ==; PREF=tz=America.New_York&f6=40000000&f5=30000; wide=1; __Secure-3PSIDCC=AJi4QfEWwr3VzFY5t0Lj2X2xMawJtYiv279uBEoJB8RejBazE0qxk4yV_MYySBELyHb4zC6HSQ';
const options = {
  requestOptions: {
    headers: {
      cookie: COOKIE
    },
  },
}
const youtubeConverter = (filePath) => (youtubeUrl, params={}) =>
  ytdl
      .getInfo(youtubeUrl, options)
      .then((info) => mergeParams(info, params, filePath))
      .then(downloadAndConvertVideo);

module.exports = youtubeConverter;