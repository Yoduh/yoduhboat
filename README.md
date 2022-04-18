# bloop-bot
add, remove, play sound bites from youtube videos all within discord

create your own bot at https://discord.com/developers/applications
<br>after pulling, create .env file with `DISCORD_TOKEN=` using your bot's token.
<br>install dependences with `yarn install`
<br>run with `node index.js`
<br>
<br>no backend (current work in progress) so all mp3 files ripped from youtube are saved to /sounds/ directory. 
metadata for sound bite files are saved locally in descriptions.json.  bot will auto create /sounds/ and descriptions.json on first run.
<br>FFMPEG must be installed on the local machine running the bot or the youtube ripping will not work


list of bot commands:
```
!!join - bot joins your voice channel
!!leave - bot leaves your voice channel
!!add <name> <youtube link> <start timestamp> <end timestamp> - adds new named sound bite. start and end timestamps optional
!!remove <name> - delete sound bite
!!volume <name> <number> - change the volume of a sound bite by multiplying its current volume value (always 1) by a given number (0.5 to halve, 2 to double, etc.)
!!play <name> - plays named sound bite
!!<name> - shorthand command to play named sound bite
!!whatis <name> - show sound bite details
!!describe <name> <text> - saves a description for a sound bite
!!stop - stop the currently playing sound bite
!!entrances - toggles whether bot should automatically play a sound bite named after a user whenever that user joins a voice channel
!!list - list all sound bites
```
