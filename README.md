# bloop-bot

add, remove, play sound bites from youtube videos all within discord

create your own bot at https://discord.com/developers/applications
<br>after pulling, create .env file with `DISCORD_TOKEN=` using your bot's token.
<br>install dependences with `yarn install`
<br>local mongodb for storing user and sound bite metadata is required
<br>run with `node index.js`
<br>
<br>all sounds files ripped from youtube are saved in opus format to the project's local /sounds directory. bot will auto create the /sounds directory on first run.
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
!!entrance <name(OPTIONAL)> - turn your entrance music on or off. provide a name to set what your entrance music should be.
!!list - list all sound bites
```
