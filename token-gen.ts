import { getRandomValues } from "crypto";

const tokenLength = 32;

let dict = '';

//	populate the dictionary
{
	//	uppercase letters
	for (let i = 65; i <= 90; i++)
		dict += String.fromCharCode(i);

	//	lowercase letters
	const dictStageOneLength = dict.length;
	for (let i = 0; i <= dictStageOneLength; i++)
		dict += dict[i].toLowerCase();

	//	numbers
	for (let i = 0; i <= 10; i++)
		dict += i.toString();

	//	a few special characters. or just one for now 🗿
	dict += '_';
}

const noiseArray = new Uint8Array(tokenLength);
getRandomValues(noiseArray);
const dictLength = dict.length;
let newToken = 'rdfl_';

for (let i = 0; i < noiseArray.length; i++) {
	const charIdx = Math.round(noiseArray[i] / 256 * dictLength);
	newToken += dict[charIdx];
}

console.log('Use this as your authntification token:', newToken);
