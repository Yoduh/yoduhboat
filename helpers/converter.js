const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');

const downloadAndConvertVideo = ({
  title,
  videoUrl,
  startTime,
  duration,
  filePath,
  format
}) =>
  new Promise((resolve, reject) =>
    ffmpeg(ytdl(videoUrl, {filter: 'audioonly'}))
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
  filePath: filePath ?? __dirname,
  format: params.format ?? 'opus'
});

const youtubeConverter = (filePath) => (youtubeUrl, params={}) =>
  ytdl
      .getInfo(youtubeUrl)
      .then((info) => mergeParams(info, params, filePath))
      .then(downloadAndConvertVideo);

module.exports = youtubeConverter;