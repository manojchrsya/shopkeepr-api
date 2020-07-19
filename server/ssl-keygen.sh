#!/bin/bash


country=IN
state=Maharashtra
locality=Mumbai
organization=Shopkeepr
organizationalunit=IT
commonname=Shopkeepr
email=manojchrsya@gmail.com

password=ccgaeYKAUL7m9YAG

KEY_LENGTH=2048

cd ./private

## Generate server key
echo "Generating server key"
openssl genrsa -passout pass:$password -des3 -out server.key $KEY_LENGTH
openssl req -passin pass:$password -new -key server.key -out server.csr \
  -subj "/C=$country/ST=$state/L=$locality/O=$organization/OU=$organizationalunit/CN=$commonname/emailAddress=$email"

# Remove the passphrase
echo "Removing the passphrase"
cp server.key server.key.org
openssl rsa -passin pass:$password -in server.key.org -out server.key

# Generate server certificate
echo "Generating server certificate"
openssl x509 -req -days 730 -in server.csr -signkey server.key -out server.pem
cp server.pem certificate.pem
cp server.key privatekey.pem
rm server.pem server.key server.key.org server.csr
