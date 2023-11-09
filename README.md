## AutoDesign Figma
Prompt engineer your figma design and get a better output when compared to most ai to figma tools.


https://github.com/jonathanpv/simple-figma-plugin/assets/44036128/a9f54032-42c3-4ea4-a027-4853c6c1a4d7


## Installation
1. Clone repo
2. Open a figma file, right click, plugins > development, import plugin from manifest, navigate to manifest.json of this repo
3. npm i 
4. npm run watch


## Features
- Fine tune on a layer by layer basis, Figma will likely implement this themselves so this feature will eventually be obsolete
- Get the description recrusively for the component / app you have selected, you can paste to chatgpt directly or use the api key
- Use the SVG strings in the final output of your app render

## Work in progress
- Make an agent iterate on the code using OpenAI vision API
- Display preview of generated site within extension, either iframe or a new button click
- Make agent accessible via API and integrate within plugin

## License
MIT


