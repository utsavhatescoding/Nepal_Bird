"""Isolate TensorFlow-only conversion from incompatible optional JAX/forest imports.

Run only inside the disposable conversion environment described in CONVERSION.md.
No model operations, topology or weights are changed.
"""
from importlib.metadata import distribution, version
from pathlib import Path
if version('tensorflowjs') != '4.22.0':
    raise RuntimeError('This compatibility adjustment is only for tensorflowjs 4.22.0.')
root = Path(distribution('tensorflowjs').locate_file('tensorflowjs/converters'))
changes = {
    '__init__.py': ('from tensorflowjs.converters.jax_conversion import convert_jax', '# Optional JAX converter omitted in this TensorFlow-only environment.'),
    'tf_saved_model_conversion_v2.py': ('import tensorflow_decision_forests', '# Optional forest op registration omitted; EfficientNet contains no forest ops.'),
}
for filename, (original, replacement) in changes.items():
    path = root / filename
    source = path.read_text()
    if original not in source and replacement not in source:
        raise RuntimeError(f'Unexpected converter source in {filename}.')
    path.write_text(source.replace(original, replacement))
print('Prepared TensorFlow-only converter imports.')
