#!/bin/sh

DIR=$(realpath -e $0)
DIR=$(dirname $DIR)
DIST="$DIR/dist"
echo "Build foxhorn in $DIR"
rm $DIST/*
mkdir "$DIST"
cd "$DIR"
zip -r "$DIST/foxhorn-ff.zip" icons src LICENSE README.md manifest.json