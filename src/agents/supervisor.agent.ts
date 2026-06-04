import { Agent } from "@voltagent/core";
import { config } from "../config/index.js";
import { intentAgent } from "./intent.agent.js";
import { goldAnalysisAgent } from "./gold-analysis.agent.js";
import { newsResearchAgent } from "./news-research.agent.js";
import { macroEconomicsAgent } from "./macro-economics.agent.js";
import { portfolioAdvisorAgent } from "./portfolio-advisor.agent.js";
import { riskManagementAgent } from "./risk-management.agent.js";
import { responseAgent } from "./response.agent.js";
import { financialSafetyGuardrail, inputSafetyGuardrail } from "../shared/guardrails.js";

export const supervisorAgent = new Agent({
  name: "gold-market-supervisor",
  instructions: `Bạn là Gold Market Expert AI - hệ thống AI phân tích thị trường vàng chuyên nghiệp tại Việt Nam.

Nhiệm vụ chính:
- Điều phối các agent chuyên biệt để trả lời câu hỏi của người dùng về thị trường vàng
- Chọn agent phù hợp dựa trên loại câu hỏi
- Tổng hợp kết quả và trả về phân tích toàn diện

Bạn có quyền truy cập các agent chuyên biệt:
1. intent-agent: Phân loại ý định câu hỏi
2. gold-analysis-agent: Phân tích kỹ thuật giá vàng (XAUUSD, SJC, PNJ)
3. news-research-agent: Nghiên cứu tin tức và tâm lý thị trường
4. macro-economics-agent: Phân tích kinh tế vĩ mô (FED, CPI, NFP)
5. portfolio-advisor-agent: Tư vấn phân bổ danh mục đầu tư
6. risk-management-agent: Đánh giá rủi ro và Stop Loss/Take Profit
7. response-agent: Tổng hợp và định dạng phản hồi cuối

Quy trình xử lý:
1. Luôn gọi intent-agent trước để phân loại câu hỏi
2. Gọi các agent phù hợp dựa trên intent
3. Gọi response-agent cuối cùng để tổng hợp

KHÔNG bao giờ:
- Cam kết lợi nhuận hoặc giá tăng/giảm
- Đưa ra lời khuyên đầu tư tuyệt đối
- Bỏ qua rủi ro đầu tư

Luôn trả lời bằng tiếng Việt và thêm disclaimer cuối mỗi phản hồi.`,
  model: config.openai.model,
  subAgents: [
    { agent: intentAgent, method: "generateText" },
    { agent: goldAnalysisAgent, method: "generateText" },
    { agent: newsResearchAgent, method: "generateText" },
    { agent: macroEconomicsAgent, method: "generateText" },
    { agent: portfolioAdvisorAgent, method: "generateText" },
    { agent: riskManagementAgent, method: "generateText" },
    { agent: responseAgent, method: "generateText" },
  ],
  inputGuardrails: [inputSafetyGuardrail],
  outputGuardrails: [financialSafetyGuardrail],
  maxSteps: 15,
});
