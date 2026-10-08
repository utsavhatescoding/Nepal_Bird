"""Reconstruct the original model and export a browser graph, with parity fixtures."""
import json
import os
from pathlib import Path
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf
import numpy as np
from PIL import Image
import sys
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from model_utils import build_and_load_model, prepare_image
model = build_and_load_model()
output = ROOT / 'web' / 'public' / 'model'
output.mkdir(parents=True, exist_ok=True)
@tf.function(input_signature=[tf.TensorSpec([None, 224, 224, 3], tf.float32, name='images')])
def serving(images):
    return {'scores': model(images, training=False)}
tf.saved_model.save(model, str(ROOT / 'web' / '.saved-model'), signatures={'serving_default': serving})
fixture_dir = ROOT / 'web' / 'scripts' / 'fixtures'
fixture_dir.mkdir(parents=True, exist_ok=True)
fixtures = []
for name, image in [('hero', Image.open(ROOT / 'assets' / 'nepal-bird-hero.webp')), ('black', Image.new('RGB', (224,224))), ('grey', Image.new('RGB', (224,224), (128,128,128)))]:
    pixels = prepare_image(image)
    pixels.astype('<f4').tofile(fixture_dir / f'{name}.input.bin')
    scores = model(pixels, training=False).numpy()[0]
    fixtures.append({'name': name, 'scores': scores.tolist(), 'top3': np.argsort(scores)[-3:][::-1].tolist()})
(fixture_dir / 'parity.json').write_text(json.dumps(fixtures))
print('Saved model and Python reference predictions.')
