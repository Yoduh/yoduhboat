# bloop-bot
add, remove, play sound bites from youtube videos all within discord

create your own bot at https://discord.com/developers/applications
<br>after pulling, create .env file with `DISCORD_TOKEN=` using your bot's token.
<br>install dependences with `yarn install`
<br>run with `node index.js`
<br>
<br>no backend (I hope to make one eventually) so all mp3 files ripped from youtube are saved to ./sounds/ directory. 
optional descriptions for sound bite files are saved locally in ./descriptions.txt. 
you may need to make these yourself.
<br>FFMPEG must be installed on the local machine running the bot.


list of bot commands:
```
!!join - bot joins your voice channel
!!leave - bot leaves your voice channel
!!add <name> <youtube link> <start timestamp> <end timestamp> - adds new named sound bite. start and end timestamps optional
!!remove <name> - delete sound bite
!!play <name> - plays named sound bite
!!whatis <name> - gives a description (if available) for a sound bite
!!describe <name> <text> - saves a description for a sound bite
!!help - reminds you the format for 'add' command
!!stop - stop the currently playing sound bite
!!entrances - toggles whether bot should automatically play a sound bite named after a user whenever that user joins a voice channel
!!list - list all sound bites
```
