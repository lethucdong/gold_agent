import { createOutputGuardrail, createInputGuardrail } from "@voltagent/core";
import type { OutputGuardrailArgs, InputGuardrailArgs } from "@voltagent/core";

const FINANCIAL_COMMITMENT_PATTERNS = [
  /đảm bảo (tăng|lợi nhuận|thắng|thành công)/i,
  /chắc chắn (tăng|giảm|kiếm được)/i,
  /cam kết (lợi nhuận|tăng giá|thành công)/i,
  /100% (chắc chắn|đảm bảo|tăng)/i,
  /definitely (will rise|will increase|guaranteed)/i,
  /guaranteed (profit|return|gain)/i,
];

export const DISCLAIMER =
  "\n\n> ⚠️ **Khuyến cáo rủi ro**: Đây là thông tin tham khảo, không phải lời khuyên đầu tư chính thức. Đầu tư vàng có rủi ro mất vốn. Hãy tham khảo chuyên gia tài chính được cấp phép trước khi ra quyết định đầu tư.";

export const financialSafetyGuardrail = createOutputGuardrail({
  name: "financial-safety-guardrail",
  description: "Ngăn chặn các cam kết tài chính tuyệt đối và đảm bảo disclaimer được thêm vào",
  handler: async (args: OutputGuardrailArgs) => {
    const text = typeof args.output === "string" ? args.output : JSON.stringify(args.output);

    for (const pattern of FINANCIAL_COMMITMENT_PATTERNS) {
      if (pattern.test(text)) {
        return {
          pass: false,
          tripwire: true,
          message: "Phản hồi chứa cam kết tài chính tuyệt đối. Phải sử dụng ngôn ngữ thận trọng.",
        };
      }
    }

    return { pass: true, tripwire: false };
  },
});

export const inputSafetyGuardrail = createInputGuardrail({
  name: "input-safety-guardrail",
  description: "Kiểm tra và lọc các câu hỏi không phù hợp",
  handler: async (args: InputGuardrailArgs) => {
    const text = typeof args.input === "string" ? args.input : JSON.stringify(args.input);

    const offTopicPatterns = [/hack|crack|exploit|malware|virus/i, /illegal|bất hợp pháp|lừa đảo/i];

    for (const pattern of offTopicPatterns) {
      if (pattern.test(text)) {
        return {
          pass: false,
          tripwire: true,
          message: "Câu hỏi không phù hợp với mục đích phân tích thị trường vàng.",
        };
      }
    }

    return { pass: true, tripwire: false };
  },
});
