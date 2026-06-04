# Gold Market Expert AI — Kiến trúc hệ thống

## Tổng quan

Gold Market Expert AI là một hệ thống AI phân tích thị trường vàng chuyên nghiệp, được xây dựng bằng **VoltAgent framework** (TypeScript). Hệ thống nhận câu hỏi bằng tiếng Việt từ người dùng, phối hợp nhiều AI agent chuyên biệt, và trả về phân tích toàn diện.

---

## Cấu trúc thư mục

```
src/
├── index.ts                    # Bootstrap — khởi động toàn bộ hệ thống
├── config/
│   └── index.ts                # Cấu hình tập trung (env vars)
├── domain/
│   └── types.ts                # Domain interfaces (UserProfile, GoldPrice, ...)
├── infrastructure/
│   ├── database.ts             # PostgreSQL pool + initDatabase()
│   ├── logger.ts               # VoltAgent-compatible Pino logger
│   └── observability.ts        # VoltOps observability adapter
├── agents/                     # 8 AI agents
│   ├── supervisor.agent.ts     # Điều phối chính
│   ├── intent.agent.ts         # Phân loại câu hỏi
│   ├── gold-analysis.agent.ts  # Phân tích kỹ thuật vàng
│   ├── news-research.agent.ts  # Nghiên cứu tin tức
│   ├── macro-economics.agent.ts# Kinh tế vĩ mô
│   ├── portfolio-advisor.agent.ts # Tư vấn danh mục
│   ├── risk-management.agent.ts# Quản lý rủi ro
│   └── response.agent.ts       # Tổng hợp phản hồi
├── workflows/
│   └── gold-analysis.workflow.ts # Workflow 8 bước chính
├── tools/                      # 8 VoltAgent tools
│   ├── get-gold-price.tool.ts
│   ├── get-technical-analysis.tool.ts
│   ├── get-economic-calendar.tool.ts
│   ├── get-news.tool.ts
│   ├── get-fear-greed.tool.ts
│   ├── get-user-profile.tool.ts
│   ├── save-user-profile.tool.ts
│   └── search-knowledge-base.tool.ts
├── rag/
│   ├── embedder.ts             # OpenAI text-embedding-3-small
│   └── knowledge-base.service.ts # pgvector RAG search
├── memory/
│   └── user-memory.service.ts  # CRUD user profiles + chat history (PostgreSQL)
├── shared/
│   └── guardrails.ts           # Input/Output guardrails bảo vệ tài chính
├── mcp/
│   ├── market.mcp.ts           # MCP server dữ liệu thị trường
│   ├── news.mcp.ts             # MCP server tin tức (Brave Search)
│   └── database.mcp.ts         # MCP server PostgreSQL
└── api/
    ├── chat.handler.ts         # POST /api/chat handler
    └── routes.ts               # Đăng ký toàn bộ routes
```

---

## Kiến trúc tổng thể

```
Client (HTTP)
     │
     ▼
POST /api/chat
     │
     ▼
┌─────────────────────────────────────────────┐
│              Gold Analysis Workflow          │
│  (createWorkflowChain — 8 bước tuần tự)     │
│                                             │
│  Step 1: Intent Detection (andAgent)        │
│  Step 2: Retrieve User Memory (andThen)     │
│  Step 3: Technical Analysis (andThen)       │
│  Step 4: News Research (andThen)            │
│  Step 5: Macro Economics (andThen)          │
│  Step 6: Portfolio Advice (andThen)         │
│  Step 7: Risk Assessment (andThen)          │
│  Step 8: Synthesize Response (andAgent)     │
└─────────────────────────────────────────────┘
     │
     ▼
JSON Response: { answer, confidence, agentsUsed, sources, disclaimer }
```

---

## Luồng xử lý chi tiết (mỗi request)

### 1. Nhận request
`POST /api/chat` với body:
```json
{
  "userId": "user_123",
  "message": "Giá vàng SJC hôm nay bao nhiêu?",
  "conversationId": "conv_abc" // tuỳ chọn
}
```

### 2. Chạy Workflow

#### Bước 1 — Intent Detection
- **Agent**: `goldAnalysisAgent` (dùng LLM phân tích)
- **Output**: JSON flags quyết định agent nào sẽ chạy:
  ```json
  {
    "intent": "price_query",
    "needNews": false,
    "needMacro": false,
    "needTechnical": true,
    "needPortfolio": false,
    "needRisk": false,
    "confidence": 0.95
  }
  ```

#### Bước 2 — Retrieve User Memory
- Truy vấn PostgreSQL lấy `user_profiles` và 5 tin nhắn gần nhất từ `chat_history`
- Cá nhân hóa phân tích dựa trên risk profile, portfolio value của user

#### Bước 3 — Technical Analysis (nếu `needTechnical = true`)
- **Agent**: `goldAnalysisAgent`
- **Tools được dùng**:
  - `getGoldPrice` → lấy giá XAUUSD, SJC, PNJ
  - `getTechnicalAnalysis` → tính SMA20/50/200, RSI, MACD, Bollinger Bands
  - `searchKnowledgeBase` → tìm tài liệu phân tích kỹ thuật từ pgvector

#### Bước 4 — News Research (nếu `needNews = true`)
- **Agent**: `newsResearchAgent`
- **Tools**: `getNews` (Reuters, Bloomberg, Kitco), `getFearGreed` (sentiment 0-100)

#### Bước 5 — Macro Economics (nếu `needMacro = true`)
- **Agent**: `macroEconomicsAgent`
- **Tools**: `getEconomicCalendar` (FOMC, CPI, NFP, PPI), `searchKnowledgeBase`

#### Bước 6 — Portfolio Advice (nếu `needPortfolio = true`)
- **Agent**: `portfolioAdvisorAgent`
- **Tools**: `getUserProfile`, `saveUserProfile`, `searchKnowledgeBase`

#### Bước 7 — Risk Assessment (nếu `needRisk = true`)
- **Agent**: `riskManagementAgent`
- **Tools**: `getGoldPrice`, `getTechnicalAnalysis`, `getUserProfile`
- Tính Stop Loss, Take Profit, Risk/Reward ratio

#### Bước 8 — Synthesize Response
- **Agent**: `responseAgent` (có `outputGuardrail` kiểm tra)
- Tổng hợp tất cả kết quả thành câu trả lời tiếng Việt cấu trúc rõ ràng
- Lưu conversation vào PostgreSQL `chat_history`

### 3. Fallback
Nếu workflow thất bại → `supervisorAgent.generateText()` xử lý trực tiếp

---

## Các tầng lưu trữ

```
┌─────────────────────────────────────┐
│          LibSQL (.voltagent/)        │
│  VoltAgent conversation memory       │
│  (tự động quản lý bởi framework)    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│     PostgreSQL + pgvector            │
│                                     │
│  user_profiles                      │
│    └─ userId, name, riskProfile,    │
│       portfolioValue, goldPct...    │
│                                     │
│  knowledge_chunks                   │
│    └─ content, source,              │
│       embedding vector(1536)        │
│       (RAG với cosine similarity)   │
│                                     │
│  chat_history                       │
│    └─ userId, role, content,        │
│       metadata (agentsUsed, ...)    │
└─────────────────────────────────────┘
```

---

## Guardrails (bảo vệ tài chính)

Hệ thống có 2 lớp kiểm tra tự động:

| Guardrail | Loại | Tác dụng |
|---|---|---|
| `inputSafetyGuardrail` | Input | Chặn câu hỏi off-topic (hack, exploit, lừa đảo) |
| `financialSafetyGuardrail` | Output | Chặn cam kết tài chính tuyệt đối ("đảm bảo tăng", "100% chắc chắn") |

Khi guardrail kích hoạt (`tripwire: true`), VoltAgent tự động dừng pipeline và trả lỗi.

---

## Agents và Tools

### Supervisor Agent
- **Role**: Điều phối tổng thể, fallback khi workflow không chạy được
- **Sub-agents**: 7 agents con (intent, goldAnalysis, newsResearch, macro, portfolio, risk, response)
- **Guardrails**: cả input lẫn output

### Tool Registry

| Tool | Dữ liệu trả về | Nguồn |
|---|---|---|
| `getGoldPrice` | Giá XAUUSD/SJC/PNJ, change% | Mock (TODO: Goldapi.io) |
| `getTechnicalAnalysis` | SMA, RSI, MACD, Bollinger | Mock calculation |
| `getEconomicCalendar` | FOMC, CPI, NFP events | Mock |
| `getNews` | Tin tức từ Reuters, Bloomberg | Mock (TODO: NewsAPI) |
| `getFearGreed` | Chỉ số tâm lý 0-100 | Mock |
| `getUserProfile` | Hồ sơ nhà đầu tư | PostgreSQL |
| `saveUserProfile` | Lưu/cập nhật hồ sơ | PostgreSQL |
| `searchKnowledgeBase` | Tài liệu tương tự (cosine ≥ 0.7) | pgvector |

---

## RAG (Retrieval-Augmented Generation)

```
Câu hỏi user
     │
     ▼
embedText() ──► OpenAI text-embedding-3-small (1536 dims)
     │
     ▼
pgvector cosine similarity search
     │  WHERE similarity > 0.7
     ▼
Top-5 knowledge chunks
     │
     ▼
Đưa vào context của agent
```

Knowledge base được seed sẵn 5 tài liệu khi khởi động lần đầu:
- Gold Investment Basics (World Gold Council)
- Technical Analysis Documentation (SMA, RSI, MACD)
- FED & Monetary Policy Impact
- Macro Indicators (CPI, PPI, NFP)
- Portfolio Allocation Guidelines

---

## MCP Servers (Model Context Protocol)

| File | Server | Mục đích |
|---|---|---|
| `market.mcp.ts` | market-data-server | Dữ liệu giá vàng/forex real-time |
| `news.mcp.ts` | brave-search MCP | Tìm kiếm tin tức qua Brave API |
| `database.mcp.ts` | postgres MCP | Truy vấn PostgreSQL trực tiếp |

---

## Stack công nghệ

| Thành phần | Công nghệ |
|---|---|
| AI Framework | VoltAgent `@voltagent/core` v2.7.6 |
| LLM | OpenAI GPT-4o (`openai/gpt-4o`) |
| Embeddings | OpenAI `text-embedding-3-small` (1536d) |
| HTTP Server | Hono (`@voltagent/server-hono`) |
| Conversation Memory | LibSQL (`@voltagent/libsql`) |
| User Data / RAG | PostgreSQL 16 + pgvector |
| Observability | VoltOps (`@voltagent/voltops-langfuse`) |
| Language | TypeScript (strict mode) |
| Runtime | Node.js 20+ |
| Container | Docker + docker-compose |

---

## API Endpoints

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/api/chat` | Chat chính — chạy workflow phân tích |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/info` | Thông tin hệ thống, danh sách agents |
| `GET` | `/api/playground` | VoltAgent UI playground (tích hợp sẵn) |

### Request / Response mẫu

**Request:**
```bash
curl -X POST http://localhost:3141/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_001",
    "message": "Nên mua hay bán vàng lúc này?"
  }'
```

**Response:**
```json
{
  "answer": "Dựa trên phân tích kỹ thuật hiện tại...",
  "confidence": 0.82,
  "agentsUsed": ["gold-analysis-agent", "news-research-agent", "response-agent"],
  "sources": ["Technical Analysis Documentation"],
  "memoryUsed": true,
  "disclaimer": "⚠️ Đây là thông tin tham khảo, không phải lời khuyên đầu tư...",
  "meta": {
    "conversationId": "conv_user_001_1717300000000",
    "processingTimeMs": 4200
  }
}
```

---

## Khởi động

```bash
# 1. Cài dependency
yarn install

# 2. Cấu hình env
cp .env.example .env
# Điền OPENAI_API_KEY, POSTGRES_* vào .env

# 3. Khởi động PostgreSQL
docker-compose up pgvector -d

# 4. Chạy development
yarn dev

# Hoặc chạy toàn bộ bằng Docker
docker-compose up --build
```

---

## Luồng dữ liệu khi user mới lần đầu

```
User gửi câu hỏi
     │
     ▼
Workflow chạy → getProfile(userId) → null (user mới)
     │
     ▼
Phân tích dựa trên dữ liệu thị trường (không có cá nhân hóa)
     │
     ▼
portfolioAdvisorAgent gọi saveUserProfile nếu user cung cấp thông tin
     │
     ▼
Lần sau → userProfile có sẵn → phân tích cá nhân hóa
```
