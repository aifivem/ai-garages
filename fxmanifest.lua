name 'ai-garages'
author 'TGIANN'
version '0.1.0'
license 'GPL-3.0-only'
description 'Garages: park, take out, job fleets and the impound lot'
repository 'https://github.com/aifivem/ai-garages'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_script 'dist/client.js'
server_script 'dist/server.js'
ui_page 'dist/web/index.html'

dependencies {
	'/onesync',
	'ai-core',
	'ai-vehicles',
}

files {
	'locales/*.json',
	'dist/web/assets/*.js',
	'dist/web/assets/*.css',
	'dist/web/assets/*.woff',
	'dist/web/assets/*.woff2',
	'dist/web/*.html',
	'data/settings.json',
	'data/garages.json',
}
