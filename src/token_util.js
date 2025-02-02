import axios from 'axios';
import Cookie from 'universal-cookie';

// Function to retrieve or refresh the speech token
export async function getTokenOrRefresh() {
    const cookie = new Cookie();
    const speechToken = cookie.get('speech-token'); // Retrieve the token from cookies if available

    if (speechToken === undefined) {
        // If no token exists, request a new one from the server
        try {
            const res = await axios.get('/api/get-speech-token');
            const token = res.data.token;
            const region = res.data.region;

            // Store the token in cookies with a max age of 540 seconds
            cookie.set('speech-token', region + ':' + token, { maxAge: 540, path: '/' });

            console.log('Token fetched from back-end: ' + token);
            return { authToken: token, region: region };
        } catch (err) {
            console.log(err.response.data);
            return { authToken: null, error: err.response.data }; // Return error if the token request fails
        }
    } else {
        // Parse the token from the cookie
        console.log('Token fetched from cookie: ' + speechToken);
        const idx = speechToken.indexOf(':');
        return { authToken: speechToken.slice(idx + 1), region: speechToken.slice(0, idx) };
    }
}