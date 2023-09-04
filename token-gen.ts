
//	set token length
const tokenLength = 64;

//	get some random noise
const noiseArray = new Uint8Array(tokenLength);
crypto.getRandomValues(noiseArray);

const dict = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyza012345678910';
let uniqueToken = '';

//	map noise to characters from the dictionary
for (let i = 0; i < noiseArray.length; i++) {
	const charIdx = Math.floor(noiseArray[i] / 256 * dict.length);
	uniqueToken += dict[charIdx];
}

//	output generated token
console.log('Use this as your authntification token:', `rdfl_${uniqueToken}`);
