1. Indexing-Level Mechanisms (Knowledge Representation Control)

These mechanisms improve  *retrieval reliability before retrieval even happens* .

### 1.1 Chunk Optimization Mechanisms

#### (a) Small-to-Big Retrieval Linking

 **Mechanism** : Separate *retrieval units* from  *generation units* .

* Retrieval chunk: ( d_s )
* Generation chunk: ( d_l )
* Mapping: ( \pi(d_s) = d_l )

You retrieve over ( d_s ) but inject ( d_l ) into the generator.

This reduces embedding noise while preserving context length during generation.

 **Adaptation value** :

* Works with existing vector DB
* No retriever retraining required
* Improves factual completeness

---

#### (b) Overlap-Aware Chunking

Define chunk size ( L_i ) and overlap ( L_i^o ):

[
L_i = |d_i|,\quad L_i^o = |d_i \cap d_{i+1}|
]

You can **optimize overlap dynamically** depending on document type:

* Narrative text → higher ( L^o )
* Tables / legal docs → lower ( L^o )

---

### 1.2 Structured Indexing Mechanisms

#### (a) Hierarchical Index Traversal

Documents are stored as a tree:

[
T = (V, E), \quad v_i \rightarrow v_j \text{ (parent-child)}
]

Each node stores:

* summary embedding ( e(v_i) )
* pointer to child chunks

Retrieval becomes  **top-down pruning** , not flat top-k.

 **Benefit** :

* Reduces hallucination caused by semantically similar but topically wrong chunks.

---

#### (b) Knowledge Graph (KG) Index

Corpus represented as:

[
G = {V, E, X}
]

* ( V ): passages, tables, sections
* ( E ): semantic / structural relations
* ( X ): textual features

Retrieval becomes **constraint-based** rather than similarity-only.

---

## 2. Pre-Retrieval Mechanisms (Query Control Layer)

These mechanisms  **shape the retrieval signal before embedding similarity** .

### 2.1 Query Expansion Mechanisms

#### (a) Multi-Query Expansion

[
f_{qe}(q) = {q_1, q_2, \dots, q_n}
]

Each query runs independently, retrieval results are merged later.

 **Key risk** : intent dilution
 **Mitigation** : weight original query higher during fusion.

---

#### (b) Sub-Query Decomposition

Break complex query into ordered sub-goals:

[
q \rightarrow {q^{(1)}, q^{(2)}, \dots, q^{(k)}}
]

This pairs naturally with **iterative retrieval loops** (Section 6).

---

### 2.2 Query Transformation Mechanisms

#### (a) Rewrite-Based Retrieval

[
f_{qt}(q) = q'
]

Rewrite is optimized for  **retrieval effectiveness** , not readability.

---

#### (b) HyDE (Hypothetical Document Embedding)

Generate hypothetical answer ( \hat{d} ) and embed it:

[
\text{Retrieve via } \text{Sim}(e(\hat{d}), e(d_i))
]

This  **inverts the similarity space** : answer-to-answer instead of question-to-answer.

---

#### (c) Step-back Abstraction

Use both:

* original query ( q )
* abstract query ( q_{abs} )

Final retrieval set:
[
D_q = D(q) \cup D(q_{abs})
]

---

### 2.3 Query Construction (Structured Data Access)

Convert natural language into executable query:

[
f_{qc}(q) = q^* \in {\text{SQL, Cypher, etc.}}
]

This enables  **hybrid semantic + symbolic retrieval** .

---

## 3. Retrieval Mechanisms (Retriever Design Layer)

### 3.1 Hybrid Retriever Fusion

Use sparse + dense simultaneously:

[
D_q = \alpha D_q^{dense} + (1-\alpha) D_q^{sparse}
]

Sparse helps rare entities, dense helps semantic paraphrases.

---

### 3.2 Retriever Fine-Tuning Mechanisms

#### (a) Contrastive SFT

[
\mathcal{L} *{DR} = -\frac{1}{T} \sum* {i=1}^{T}
\log \frac{e^{\text{sim}(q_i, d_i^+)}}
{e^{\text{sim}(q_i, d_i^+)} + \sum_j e^{\text{sim}(q_i, d_{ij}^-)}}
]

---

#### (b) LM-Supervised Retriever (LSR)

Retriever is trained using  **generator likelihood** :

[
P_{LSR}(d|q,y) =
\frac{e^{P_{LM}(y|d,q)/\beta}}
{\sum_{d'} e^{P_{LM}(y|d',q)/\beta}}
]

This aligns retriever with downstream generation success.

---

## 4. Post-Retrieval Mechanisms (Context Control Layer)

### 4.1 Reranking

[
D_q^r = f_{rerank}(q, D_q)
]

Can be:

* rule-based (MMR)
* model-based (cross-encoder)

MMR objective:
[
\max_d \left[ \lambda \cdot \text{Rel}(d,q)

* (1-\lambda) \cdot \max_{d' \in S} \text{Sim}(d,d') \right]
  ]

---

### 4.2 Compression

[
D_q^c = f_{comp}(q, D_q), \quad |d_i^c| < |d_i|
]

Example: LLMLingua removes low-importance tokens without retraining the main LLM.

---

### 4.3 Selection (Hard Filtering)

[
D_q^s = {d_i \in D_q \mid \neg P(d_i)}
]

Predicate ( P(d_i) ) can be:

* relevance threshold
* contradiction detector
* LLM critique score

---

## 5. Generation-Level Mechanisms

### 5.1 Dual Fine-Tuning (Retriever + Generator Alignment)

Retriever distribution:
[
P_R(d|q) =
\frac{e^{\text{sim}(d,q)/\gamma}}
{\sum_{d'} e^{\text{sim}(d',q)/\gamma}}
]

Generator distribution:
[
P_{LSR}(d|q,y)
]

Loss:
[
\mathcal{L} = \text{KL}(P_R || P_{LSR})
]

This enforces  **retrieval-generation consistency** .

---

### 5.2 Verification Mechanisms

[
y_k = f_{verify}(q, D_q, y)
]

Types:

* Knowledge-base verification (fact checking)
* Model-based verification (verifier LM)

Iterative regeneration until verifier accepts.

---

## 6. Orchestration Mechanisms (Control Plane)

These are the **most important upgrades** over classic RAG.

---

### 6.1 Routing Mechanisms

#### (a) Metadata Routing

[
\text{score}_{key}(q, F_j) =
\frac{|K_j \cap K'_q|}{|K'_q|}
]

---

#### (b) Semantic Routing

[
P(\theta|q) = \frac{e^{P_{LM}(\theta|q)}}{\sum_\theta e^{P_{LM}(\theta|q)}}
]

Route via intent-to-flow mapping.

---

#### (c) Hybrid Routing

[
\alpha_j =
a \cdot \text{score}_{key}

* (1-a) \cdot \text{score}_{semantic}
  ]

---

### 6.2 Scheduling Mechanisms (Loop Control)

#### (a) Rule-Based Judge

Accept answer only if:
[
\forall t,; P(y_t) \ge \tau
]

---

#### (b) LLM-Based Judge

LLM outputs control tokens (e.g., `RETRIEVE`, `CRITIQUE`, `STOP`).

---

#### (c) Knowledge-Guided Scheduling

Reasoning chain extracted from KG guides retrieval order.

---

## 7. Fusion Mechanisms (Multi-Branch Integration)

### 7.1 Weighted Probability Fusion

[
p(y|q,D_q) = \sum_{d \in D_q} p(y|d,q) \cdot \lambda(d,q)
]

[
\lambda(d,q) = \frac{e^{s(d,q)}}{\sum_{d'} e^{s(d',q)}}
]

---

### 7.2 Reciprocal Rank Fusion (RRF)

Rank aggregation robust to retriever heterogeneity.

---
