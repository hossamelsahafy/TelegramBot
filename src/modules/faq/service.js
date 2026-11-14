const FAQ = require("../../database/models/faq/model");

async function createFAQ(question, answer, createdBy) {
  if (
    typeof question !== "string" ||
    typeof answer !== "string" ||
    !question.trim() ||
    !answer.trim()
  ) {
    throw new Error("Question and answer are required");
  }

  return FAQ.create({
    question: question.trim(),
    answer: answer.trim(),
    createdBy,
  });
}

async function getFAQs(page = 1, limit = 8) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(8, Math.max(1, Number(limit) || 8));

  const [faqs, total] = await Promise.all([
    FAQ.find()
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),

    FAQ.countDocuments(),
  ]);

  return {
    faqs,
    total,
    page: safePage,
    totalPages: Math.ceil(total / safeLimit),
  };
}

async function getFAQById(faqId) {
  if (!/^[a-f\d]{24}$/i.test(faqId)) {
    return null;
  }

  return FAQ.findById(faqId).lean();
}

const updatedFAQ = await updateFAQ(data.faqId, {
  question: data.updatedQuestion || data.originalQuestion,
  answer: text,
});

if (!updatedFAQ) {
  await sendMessage(chatId, "DEBUG: FAQ was not found.");
  return true;
}

await sendMessage(
  chatId,
  `DEBUG RESULT:\n\nQuestion: ${updatedFAQ.question}\n\nAnswer: ${updatedFAQ.answer}`,
);

async function deleteFAQ(faqId) {
  if (!/^[a-f\d]{24}$/i.test(faqId)) {
    return null;
  }

  return FAQ.findByIdAndDelete(faqId);
}

module.exports = {
  createFAQ,
  getFAQs,
  getFAQById,
  updateFAQ,
  deleteFAQ,
};
