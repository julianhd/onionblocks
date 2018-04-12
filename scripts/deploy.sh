npm pack
gsutil cp onionblocks-1.0.0.tgz gs://onionblocks-deploy
gcloud compute instances create onionblocks-1 --tags=http-server --metadata-from-file startup-script=scripts/gcloud-instance-startup.sh
