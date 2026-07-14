# webgpu-r3t-frontend
WebGPU Real-Time Transcription &amp; Translation Frontend WebUI

To run this subsystem, the Node.js JavaScript runtime environment first needs to be setup:
Run `npm i` in project root directory command line to install the dependency libraries in `package.json`.
After that, change `VITE_LAN_IP`'s value in `.env` and `host`'s value in `vite.config.js` to your machine's LAN IP.
Then you can run `npm run dev` to run the development server, which the WebUI will be available at `https://<Your LAN IP>:3002`.

For the python backends in cloud mode, we provided two simple server scripts `transcript.py` and `translate.py`, which are in the `python-backend` folder.
To run the backends, Python 3.12 environment and CUDA 12.1 first needs to be setup:
Run `pip install -r "requirements.txt"` to install the dependency libraries.
After that, change `LAN_IP`, `WebUI_LAN_Port` and `Endpoint_LAN_Port` in `transcript.py` aand `translate.py` to your machine's LAN IP and desired LAN ports.
Then run `python transcript.py` and `python translate.py`, enter the endpoints and ports in the WebUI in the configuration button's second page.

