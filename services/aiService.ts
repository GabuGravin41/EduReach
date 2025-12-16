export default {
  generateQuiz: async (data: any) => {
    await new Promise(r => setTimeout(r, 1000));
    return [
      { question: "Sample Question 1?", options: ["A", "B", "C", "D"], correctAnswer: "A" },
      { question: "Sample Question 2?", options: ["A", "B", "C", "D"], correctAnswer: "B" }
    ];
  },
  chat: async (data: any) => {
    await new Promise(r => setTimeout(r, 1000));
    return "This is a mock AI response. I'm helping you learn!";
  }
};