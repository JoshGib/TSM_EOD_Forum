#!/bin/bash
set -e

source /anaconda/etc/profile.d/conda.sh

conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r

conda create -n py314 python=3.14.3 -y

conda activate py314

pip install --upgrade pip

pip install -r requirements.txt

