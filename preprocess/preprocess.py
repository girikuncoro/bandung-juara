"""
    Script for merging multiple CSV files
    Usage: python preprocess.py
"""
import csv
import os


PATH = '../rawdata/panic'
OUTPUT = '../data/panic.csv'


class PreProcess(object):
    def __init__(self):
        self.files = []

    def collect(self, path):
        for file in os.listdir(path):
            if file.endswith('.csv'):
                self.files.append('{}/{}'.format(path, file))

    def read(self, file, writer):
        with open(file) as f:
            reader = csv.DictReader(f)
            for row in reader:
                writer.writerow({
                    'name': row['name'],
                    'start_time': row['start_time'],
                    'end_time': row['end_time'],
                    'address': row['address'],
                })

    def merge(self, outfile):
        with open(outfile, 'w') as f:
            fieldnames = ['name', 'start_time', 'end_time', 'address']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for file in self.files:
                self.read(file, writer)


if __name__ == '__main__':
    pre = PreProcess()
    pre.collect(PATH)
    pre.merge(OUTPUT)
