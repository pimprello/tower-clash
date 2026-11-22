# Tower Clash's own commentator (Rellz, 2026-11-17: "make the voice clearer and more appropriate, it should be like League of
# Legends, it should be like a witch girl fortune teller"). Tower Clash only: the other games keep the shared sfx/call-*.wav.
# The same cue ids as commentary.js (so commentary.js stays identical in every game), said by a young woman's voice as a
# fortune teller who saw it all coming. Clear, not shouted: no drive, a gentle lift in the air band, a soft shimmer doubled a few
# cents up, and a short airy room, the way game champions' lines sound. Writes sfx/oracle/call-<id>.wav; render.js uses that folder
# when it exists. Run once by hand:
#   python3 sfx/make_oracle.py <folder with en_GB-jenny_dioco-medium.onnx and .onnx.json>
# (the voice is in https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_GB-jenny_dioco-medium.tar.bz2)
# Needs numpy, scipy and piper.
import os, sys, subprocess, tempfile, numpy as np, scipy.io.wavfile as wf, scipy.signal as ss
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'oracle')
VOICE = sys.argv[1] if len(sys.argv) > 1 else '.'
NAME = 'en_GB-jenny_dioco-medium'
LINES = {
    'first-blood': 'The first soul is claimed.', 'and-were-off': 'And so, it begins.',
    'what-a-combo': 'The cards foretold this!', 'unstoppable': 'Fate itself cannot stop them!', 'triple-kill': 'Three threads, cut!',
    'titan-down': 'Even giants bow to fate.', 'the-giant-falls': "The giant's thread is cut.",
    'what-a-hit': 'Ooh, I saw that coming!', 'ouch': 'Ooh, that will leave a mark.', 'crushed': 'Crushed, as foretold.',
    'last-one-standing': 'Only one thread remains.', 'hold-the-line': 'Hold on, little ones!',
    'split-in-two': 'Two fates, from one!', 'traitor': 'A traitor! The stars warned me.', 'switched-sides': 'Their fate has turned!',
    'gate-is-down': 'The gate falls, as written.', 'what-a-spell': 'Such delicious magic!', 'unbelievable': 'Even I did not see that!',
    'theyre-finished': 'Their fate is sealed.', 'what-a-finish': 'Just as the cards foretold!', 'its-all-over': 'It is written. It is done.',
}
def hp(x, hz): b, a = ss.butter(2, hz / (SR / 2), 'high'); return ss.lfilter(b, a, x).astype(np.float32)
def lp(x, hz): b, a = ss.butter(2, hz / (SR / 2)); return ss.lfilter(b, a, x).astype(np.float32)
def shelf_air(x): return x + 0.22 * hp(x, 5500)
def comp(x, thr=0.35, ratio=3.0):
    env = np.abs(x); env = ss.lfilter([0.002], [1, -0.998], env).astype(np.float32)
    g = np.where(env > thr, (thr + (env - thr) / ratio) / (env + 1e-9), 1.0).astype(np.float32)
    return x * g
def shimmer(x, cents=9):
    # a quiet copy a few cents up and 12 ms late: the slightly magical doubling of a champion's voice, still clear
    k = 2 ** (cents / 1200); n = len(x); idx = np.arange(n) / k; y = np.interp(idx, np.arange(n), x).astype(np.float32)
    d = int(0.012 * SR); y = np.concatenate([np.zeros(d, np.float32), y[:-d]])
    return x + 0.28 * y
def room(x, seed, secs=1.1, wet=0.14):
    n = int(SR * secs); t = np.arange(n) / SR
    ir = np.random.default_rng(seed).standard_normal(n).astype(np.float32) * np.exp(-t / 0.3); ir = lp(ir, 7000); ir /= np.sqrt((ir ** 2).sum())
    return x + ss.fftconvolve(x, ir)[:len(x)].astype(np.float32) * wet
def echo(x, secs=0.24, fb=0.32, n=3):
    # (Rellz 2026-11-21: "a little echo and a fade and blend in with the music") a soft, darkened echo that fades away
    d = int(secs * SR); y = np.concatenate([x, np.zeros(d * n + int(0.5 * SR), np.float32)]); tap = lp(x, 3800)
    for k in range(1, n + 1): y[d * k:d * k + len(x)] += tap * (fb ** k)
    return y
def lower(x, semis=-1.0):
    # a touch lower and slower: a regal fortune teller rather than a chirpy one
    k = 2 ** (semis / 12); n = int(len(x) / k); return np.interp(np.arange(n) * k, np.arange(len(x)), x).astype(np.float32)
def say(text, out, seed):
    with tempfile.TemporaryDirectory() as d:
        raw = os.path.join(d, 'v.wav')
        subprocess.run(['piper', '-m', f'{VOICE}/{NAME}.onnx', '-c', f'{VOICE}/{NAME}.onnx.json', '--length-scale', '1.05', '--noise-scale', '0.5', '-f', raw],
                       input=text.encode(), check=True, capture_output=True)
        sr, x = wf.read(raw)
    x = x.astype(np.float32) / 32768.0
    if x.ndim > 1: x = x.mean(1)
    x = ss.resample_poly(x, SR, sr).astype(np.float32)
    x = hp(x, 140); x = x / (np.abs(x).max() + 1e-9)
    # (the lower, more regal take of 2026-11-21 was for Territory Clash: Rellz; not used here)
    x = comp(x); x = shelf_air(x); x = shimmer(x); x = room(x, seed, wet=0.2)
    on = np.where(np.abs(x) > 0.02)[0]
    if len(on): x = x[max(0, on[0] - int(0.02 * SR)):on[-1] + int(0.3 * SR)]
    x = echo(x)
    on = np.where(np.abs(x) > 0.004)[0]
    if len(on): x = x[:on[-1] + int(0.05 * SR)]
    # it fades in and out instead of starting and stopping dead, so it sits in the music
    fi, fo = int(0.04 * SR), int(0.45 * SR); x[:fi] *= np.linspace(0, 1, fi) ** 2; x[-fo:] *= np.linspace(1, 0, fo) ** 1.5
    x *= 0.89 / (np.abs(x).max() + 1e-9)
    wf.write(out, SR, (np.stack([x, x], 1) * 32767).astype(np.int16))
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    import shutil; shutil.copy(os.path.join(HERE, 'crowd-bed.wav'), os.path.join(OUT, 'crowd-bed.wav'))   # (commentary.js reads the crowd from the same folder)
    for i, (k, text) in enumerate(LINES.items()):
        say(text, os.path.join(OUT, f'call-{k}.wav'), 100 + i); print('made', k)
