# Builds the commentator's lines and the crowd (rules.picks: Rellz, 2026-11-16, ideas 25 and 26), the same files in every Clash
# game. The commentator is Piper text-to-speech (en_GB-northern_english_male-medium, a different voice from the charge's war cry),
# made punchier and given a little stadium room; the crowd is made from filtered noise: a murmuring bed that loops seamlessly,
# which the render swells on every kill. Run once by hand:
#   python3 sfx/make_commentary.py <folder with the voice: en_GB-northern_english_male-medium.onnx and .onnx.json>
# (the voice is in https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_GB-northern_english_male-medium.tar.bz2)
# Needs numpy, scipy and piper. The videos only read the wavs it writes next to it (call-*.wav, crowd-bed.wav).
import os, sys, subprocess, tempfile, numpy as np, scipy.io.wavfile as wf, scipy.signal as ss
SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = sys.argv[1] if len(sys.argv) > 1 else '.'
NAME = 'en_GB-northern_english_male-medium'
# the lines: file id -> what is said (commentary.js knows which cue each one answers)
LINES = {
    'first-blood': 'First blood!', 'and-were-off': "And we're off!",
    'what-a-combo': 'What a combo!', 'unstoppable': 'Unstoppable!', 'triple-kill': 'Triple kill!',
    'titan-down': 'Titan down!', 'the-giant-falls': 'The giant falls!',
    'what-a-hit': 'What a hit!', 'ouch': 'Ouch, that has to hurt!', 'crushed': 'Crushed!',
    'last-one-standing': 'Last one standing!', 'hold-the-line': 'Hold the line!',
    'split-in-two': 'It split in two!', 'traitor': 'Traitor!', 'switched-sides': "He's switched sides!",
    'gate-is-down': 'The gate is down!', 'what-a-spell': 'What a spell!', 'unbelievable': 'Unbelievable!',
    'theyre-finished': "They're finished!", 'what-a-finish': 'What a finish!', 'its-all-over': "It's all over!",
}
def lowpass(x, hz): b, a = ss.butter(2, hz / (SR / 2)); return ss.lfilter(b, a, x).astype(np.float32)
def highpass(x, hz): b, a = ss.butter(2, hz / (SR / 2), 'high'); return ss.lfilter(b, a, x).astype(np.float32)
def band(x, lo, hi): b, a = ss.butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return ss.lfilter(b, a, x).astype(np.float32)
def room(x, seed, secs=0.9, wet=0.16):
    n = int(SR * secs); t = np.arange(n) / SR
    ir = np.random.default_rng(seed).standard_normal(n).astype(np.float32) * np.exp(-t / 0.22); ir = lowpass(ir, 4500); ir /= np.sqrt((ir ** 2).sum())
    return x + ss.fftconvolve(x, ir)[:len(x)].astype(np.float32) * wet
def say(text, out):
    with tempfile.TemporaryDirectory() as d:
        raw = os.path.join(d, 'v.wav')
        subprocess.run(['piper', '-m', f'{VOICE}/{NAME}.onnx', '-c', f'{VOICE}/{NAME}.onnx.json', '--length-scale', '0.88', '-f', raw],
                       input=text.encode(), check=True, capture_output=True)
        sr, x = wf.read(raw)
    x = x.astype(np.float32) / 32768.0
    if x.ndim > 1: x = x.mean(1)
    x = ss.resample_poly(x, SR, sr).astype(np.float32)
    # excited, close and punchy: a little higher energy (gentle drive), presence, no rumble, a short stadium room
    x = highpass(x, 120); x = x / (np.abs(x).max() + 1e-9)
    x = np.tanh(x * 1.8) / np.tanh(1.8)
    x = x + 0.25 * band(x, 2200, 5200)
    x = room(x, hash(out) & 0xFFFF)
    # trim the silence and add short fades
    on = np.where(np.abs(x) > 0.02)[0]
    if len(on): x = x[max(0, on[0] - int(0.02 * SR)):on[-1] + int(0.25 * SR)]
    f = int(0.01 * SR); x[:f] *= np.linspace(0, 1, f); x[-f * 4:] *= np.linspace(1, 0, f * 4)
    x *= 0.89 / (np.abs(x).max() + 1e-9)
    st = np.stack([x, x], 1)
    wf.write(out, SR, (st * 32767).astype(np.int16))
def crowd(out, secs=12.0, seed=7):
    # many small groups of voices: band noise in the vowel range, each group swelling and dying at its own pace, panned round;
    # the last second is crossfaded into the first so the bed loops without a seam
    rng = np.random.default_rng(seed); n = int(SR * (secs + 1)); L = np.zeros(n, np.float32); R = np.zeros(n, np.float32); t = np.arange(n) / SR
    for k in range(48):
        lo = rng.uniform(250, 520); hi = lo * rng.uniform(2.2, 4.5)
        v = band(rng.standard_normal(n).astype(np.float32), lo, min(hi, 4200))
        rate = rng.uniform(0.15, 0.6); env = 0.55 + 0.45 * np.sin(2 * np.pi * (rate * t + rng.random()))
        syl = 0.75 + 0.25 * np.sin(2 * np.pi * (rng.uniform(2.5, 5.5) * t + rng.random()))
        v *= env * syl; a = rng.uniform(0, np.pi / 2)
        L += v * np.cos(a); R += v * np.sin(a)
    st = np.stack([L, R], 1); m = int(SR * 1.0)
    st[:m] = st[:m] * np.linspace(0, 1, m)[:, None] + st[-m:] * np.linspace(1, 0, m)[:, None]
    st = st[:-m]
    st *= 0.7 / (np.abs(st).max() + 1e-9)
    wf.write(out, SR, (st * 32767).astype(np.int16))
for k, text in LINES.items(): say(text, os.path.join(HERE, f'call-{k}.wav'))
crowd(os.path.join(HERE, 'crowd-bed.wav'))
print('ok', len(LINES), 'lines and the crowd bed')
