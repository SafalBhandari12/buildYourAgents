If the model supports reranking (e.g. `BAAI/bge-reranker-v2-m3`), you can call the Hugging Face Inference API directly and send **one query with multiple documents** in a single request. Hugging Face's JS SDK provides a unified inference client, though reranker models are commonly invoked via the generic inference endpoint depending on the deployed provider. ([Hugging Face][1])

```ts
const HF_TOKEN = process.env.HF_TOKEN!;

const query = 'What is serverless inference?';

const documents = [
  'Hugging Face provides serverless inference.',
  'The Eiffel Tower is in Paris.',
  'Inference Providers support many models.',
  'Cats are cute.',
];

const response = await fetch(
  'https://router.huggingface.co/hf-inference/models/BAAI/bge-reranker-v2-m3',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        query,
        documents,
      },
    }),
  },
);

const result = await response.json();

console.log(result);
```

Typical response:

```json
[
  {
    "index": 2,
    "score": 0.982
  },
  {
    "index": 0,
    "score": 0.964
  },
  {
    "index": 3,
    "score": 0.143
  },
  {
    "index": 1,
    "score": 0.021
  }
]
```

Then map the scores back to your documents:

```ts
const ranked = result.map((r: any) => ({
  document: documents[r.index],
  score: r.score,
}));

console.log(ranked);
```

Or wrap it in a reusable function:

```ts
export async function rerank(
  query: string,
  documents: string[],
): Promise<{ document: string; score: number }[]> {
  const res = await fetch(
    'https://router.huggingface.co/hf-inference/models/BAAI/bge-reranker-v2-m3',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          query,
          documents,
        },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const output = await res.json();

  return output.map((r: any) => ({
    document: documents[r.index],
    score: r.score,
  }));
}
```

This sends **all documents in a single request** rather than making one request per document, assuming the selected serverless deployment supports reranking with batched candidate documents. ([Hugging Face][1])

[1]: https://huggingface.co/docs/huggingface.js/en/inference/README?utm_source=chatgpt.com 'Hugging Face Inference'
