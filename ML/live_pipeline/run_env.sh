#!/bin/bash
set -e

source /anaconda/etc/profile.d/conda.sh

conda activate py314

python Data_parse_eod.py

python send_to_database.py