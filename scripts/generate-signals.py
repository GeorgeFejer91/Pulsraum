"""Regenerate assets/illustrations/signals.svg with NeuroKit2 0.2.13."""

from pathlib import Path

import neurokit2 as nk
import numpy as np
from scipy.signal import find_peaks


def signal_path(name, samples, peaks, cycles, crossing, baseline, gain):
    """Cut at matching rising crossings so adjacent copies join continuously."""
    rises = np.flatnonzero((samples[:-1] <= crossing) & (samples[1:] > crossing))

    def crossing_before(peak):
        i = rises[rises < peak][-1]
        return i + (crossing - samples[i]) / (samples[i + 1] - samples[i])

    # Skip startup transients. Each two-window strip holds whole breaths or beats.
    start = crossing_before(peaks[2])
    end = crossing_before(peaks[2 + cycles])
    indices = np.arange(int(start) + 1, int(end) + 1)
    x = np.r_[0, (indices - start) * 880 / (end - start), 880]
    y = baseline - gain * np.r_[crossing, samples[indices], crossing]
    if y.min() < 2 or y.max() > 102:
        raise ValueError(f"{name} exceeds the plot bounds")
    points = [f"{a:.2f},{b:.2f}" for a, b in zip(x, y)]
    lines = [" ".join(points[i:i + 10]) for i in range(0, len(points), 10)]
    return f'  <polyline id="{name}" vector-effect="non-scaling-stroke" points="' + "\n    ".join(lines) + '"/>'


def main():
    respiration = nk.rsp_simulate(duration=65, sampling_rate=25, respiratory_rate=15,
                                  method="breathmetrics", noise=0, random_state=42)
    # Polar H10 streams ECG at 130 Hz. Keep a resting rhythm with variable RR intervals.
    ecg_rate = 130
    ecg = nk.ecg_simulate(duration=20, sampling_rate=ecg_rate, heart_rate=72,
                          heart_rate_std=4, method="ecgsyn", noise=0, random_state=42,
                          ai=(0.85, -5, 32, -10, 0.6))
    breath_peaks, _ = find_peaks(respiration, distance=55, prominence=0.25)
    r_peaks, _ = find_peaks(ecg, distance=ecg_rate // 2, prominence=0.7)

    # Breathing shifts the chest lead's baseline and amplitude. Contact noise
    # varies over a different timescale, leaving both quiet and rough patches.
    t = np.arange(len(ecg)) / ecg_rate
    breath = np.sin(2 * np.pi * t / 4.3)
    ecg = ecg * (1 + 0.09 * breath) + 0.10 * breath
    rng = np.random.default_rng(73)
    knots = np.arange(0, t[-1] + 0.65, 0.65)
    noise_level = np.interp(t, knots, rng.uniform(0.012, 0.065, len(knots)))
    ecg += rng.normal(0, noise_level)
    # The site plays four breaths in 16 seconds and eight beats in 6 2/3 seconds.
    paths = [
        signal_path("respiration", respiration, breath_peaks, 4, 0, 52, 76),
        signal_path("ecg", ecg, r_peaks, 8, 0.5, 66, 40),
    ]
    svg = '\n'.join(['<svg xmlns="http://www.w3.org/2000/svg">', *paths, '</svg>', ''])
    output = Path(__file__).resolve().parents[1] / "assets/illustrations/signals.svg"
    output.write_text(svg, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
