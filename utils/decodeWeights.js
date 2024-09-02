export function decodeWeightsFromBase64(base64Strings) {
    return base64Strings.map(base64Str => {
      const arrayBuffer = Uint8Array.from(atob(base64Str), c => c.charCodeAt(0)).buffer;
      return tf.loadWeights(new tf.Tensor(new Float32Array(arrayBuffer)));
    });
  }
  