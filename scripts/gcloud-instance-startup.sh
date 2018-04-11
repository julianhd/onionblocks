mkdir /opt/onionblocks
cd /opt/onionblocks
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y build-essential
gsutil cp gs://onionblocks-deploy/onionblocks-1.0.0.tgz .
npm install onionblocks-1.0.0.tgz
cd node_modules/onionblocks
mkdir data
sudo npm install forever -g
sudo forever start -o /opt/onionblocks/out.log -e /opt/onionblocks/err.log lib/server.js
