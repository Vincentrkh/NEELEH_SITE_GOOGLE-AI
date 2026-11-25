#!/usr/bin/env python3
"""Manually apply WAL frames to a SQLite main file (bypasses salt/checksum validation)."""
import struct, sys, shutil

MAIN = sys.argv[1] if len(sys.argv) > 1 else '/tmp/recover/custom.db'
WAL  = sys.argv[2] if len(sys.argv) > 2 else '/tmp/recover/custom.db-wal'
OUT  = sys.argv[3] if len(sys.argv) > 3 else '/tmp/recover/rebuilt.db'

shutil.copy(MAIN, OUT)
wal = open(WAL, 'rb').read()

magic, version, pagesize, ckpt_seq, salt1, salt2, hck1, hck2 = struct.unpack('>8I', wal[:32])
print(f'pagesize={pagesize} salt1={salt1} salt2={salt2} ckpt_seq={ckpt_seq}')

# verify header checksum (rolling, over first 24 bytes, seed 0)
# magic LSB 0x82 -> little-endian checksum words, 0x83 -> big-endian
ckfmt = '<2I' if (magic & 1) == 2 else '>2I'
if magic & 0x1 == 0:
    ckfmt = '<2I'  # 0x377f0682 -> little endian
else:
    ckfmt = '>2I'  # 0x377f0683 -> big endian
print('checksum word order:', ckfmt)

def wal_cksum(data, s1=0, s2=0):
    for i in range(0, len(data) - len(data) % 8, 8):
        x1, x2 = struct.unpack_from(ckfmt, data, i)
        s1 = (s1 + x1 + s2) & 0xFFFFFFFF
        s2 = (s2 + x2 + s1) & 0xFFFFFFFF
    return s1, s2

s1, s2 = wal_cksum(wal[:24])
hdr_ok = (s1, s2) == (hck1, hck2)
print(f'header checksum ok={hdr_ok}')

off = 32
frames = []
last_commit_end = 0  # byte offset in wal after last valid commit frame
n_valid = 0
fs1, fs2 = s1, s2  # checksum chain continues from header
while off + 24 + pagesize <= len(wal):
    pgno, commit_size, fsalt1, fsalt2, fck1, fck2 = struct.unpack('>6I', wal[off:off+24])
    page = wal[off+24:off+24+pagesize]
    if fsalt1 != salt1 or fsalt2 != salt2:
        print(f'frame {len(frames)+1}: salt mismatch (stale frame) -> stop')
        break
    # frame checksum: cumulative over frame header first 8 bytes + page data
    fs1, fs2 = wal_cksum(wal[off:off+8], fs1, fs2)
    fs1, fs2 = wal_cksum(page, fs1, fs2)
    if (fs1, fs2) != (fck1, fck2):
        print(f'frame {len(frames)+1}: checksum mismatch -> stop (frames after this are invalid)')
        break
    frames.append((pgno, commit_size, page))
    n_valid += 1
    if commit_size != 0:
        last_commit_end = off + 24 + pagesize
        last_commit_pages = commit_size
    off += 24 + pagesize

print(f'valid frames: {n_valid}')
# find last commit frame among valid
last_commit_size = 0
last_commit_idx = -1
for i, (pgno, cs, _) in enumerate(frames):
    if cs != 0:
        last_commit_size = cs
        last_commit_idx = i
print(f'last commit frame idx={last_commit_idx} db size (pages): {last_commit_size}')
# ONLY apply frames up to and including the last commit frame (uncommitted tail is invalid)
frames = frames[:last_commit_idx + 1]

# apply frames in order
max_page = 0
for pgno, cs, page in frames:
    with open(OUT, 'r+b') as f:
        f.seek((pgno - 1) * pagesize)
        f.write(page)
    max_page = max(max_page, pgno)
    if cs != 0:
        # set db size to cs pages
        fsize = cs * pagesize
        cur = __import__('os').path.getsize(OUT)
        if cur > fsize:
            with open(OUT, 'r+b') as f:
                f.truncate(fsize)
        elif cur < fsize:
            with open(OUT, 'ab') as f:
                f.write(b'\0' * (fsize - cur))

print(f'highest page written: {max_page}, final size: {__import__("os").path.getsize(OUT)} bytes')
print(f'rebuilt -> {OUT}')
