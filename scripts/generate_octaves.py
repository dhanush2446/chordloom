import librosa
import numpy as np
import soundfile as sf
import os

def shift_instrument(filename, steps):
    y, sr = librosa.load(filename)
    y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=steps)
    return y_shifted, sr

def generate_octaves(input_file):
    # Make sure output directory exists
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio')
    os.makedirs(output_dir, exist_ok=True)
    
    octaves = {
        "C1": -24,
        "C2": -12,
        "C3": 0,  # Adding the base note as a copied/rendered file for consistency
        "C4": 12,
        "C5": 24
    }
    
    print(f"Generating samples from {input_file}...")
    
    if not os.path.exists(input_file):
        print(f"Error: Could not find {input_file}")
        return
        
    for note, semitones in octaves.items():
        print(f"Processing {note} ({semitones} semitones)...")
        if semitones == 0:
            audio, sr = librosa.load(input_file)
        else:
            audio, sr = shift_instrument(input_file, semitones)
            
        output_path = os.path.join(output_dir, f'Instrument_{note}.wav')
        sf.write(output_path, audio, sr)
        print(f"Saved {output_path}")
        
    print("All samples generated successfully!")

if __name__ == "__main__":
    # Point to the root directory where the Instrument.wav lies
    input_path = os.path.join(os.path.dirname(__file__), '..', 'Instrument.wav')
    generate_octaves(input_path)
