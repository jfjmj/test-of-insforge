"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@insforge/sdk";

const insforge = createClient({
  baseUrl: "https://4f6xfsqn.us-east.insforge.app",
  anonKey: "ik_f6f01568b7f41dd55c371cef97c5e826",
});

const HTML_TAGS = [
  { name: "div", description: "容器元素" },
  { name: "span", description: "内联容器" },
  { name: "a", description: "链接" },
  { name: "img", description: "图片" },
  { name: "form", description: "表单" },
  { name: "input", description: "输入框" },
  { name: "button", description: "按钮" },
  { name: "ul", description: "无序列表" },
  { name: "ol", description: "有序列表" },
  { name: "li", description: "列表项" },
  { name: "table", description: "表格" },
  { name: "tr", description: "表格行" },
  { name: "td", description: "表格单元格" },
  { name: "h1", description: "一级标题" },
  { name: "p", description: "段落" },
  { name: "script", description: "脚本" },
  { name: "style", description: "样式" },
];

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<"auth" | "chat">("auth");
  const [isRegister, setIsRegister] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [masteredTags, setMasteredTags] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkUser = async () => {
    try {
      console.log("检查用户会话...");
      const { data, error } = await insforge.auth.getCurrentUser();
      console.log("会话检查结果:", { data, error });
      if (data?.user) {
        setUser(data.user);
        setView("chat");
        loadMasteredTags();
      }
    } catch (error) {
      console.error("检查用户失败:", error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    console.log("开始认证操作，模式:", isRegister ? "注册" : "登录");

    try {
      if (isRegister) {
        console.log("正在注册...");
        const { error, data } = await insforge.auth.signUp({
          email,
          password,
        });
        console.log("注册响应:", { error, data });
        if (error) throw error;
        setMessage("请去邮箱验证！");
      } else {
        console.log("正在登录...");
        const { error, data } = await insforge.auth.signInWithPassword({
          email,
          password,
        });
        console.log("登录响应:", { error, data });
        if (error) throw error;
        setUser(data?.user);
        setView("chat");
        loadMasteredTags();
      }
    } catch (error: any) {
      console.error("认证失败:", error);
      setIsError(true);
      setMessage(error.message || "连接失败，请检查网络");
    }
  };

  const handleLogout = async () => {
    await insforge.auth.signOut();
    setUser(null);
    setView("auth");
    setMessages([]);
    setMasteredTags([]);
  };

  const testConnection = async () => {
    try {
      console.log("测试连接...");
      const models = ["openai/gpt-4o-mini", "openai/gpt-4o"];
      console.log("可用模型列表：", models);
      setMessage("模型列表已打印到控制台");
    } catch (error) {
      console.error("测试连接失败：", error);
      setIsError(true);
      setMessage("测试连接失败");
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isStreaming) return;

    const userMessage = chatInput;
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setChatInput("");
    setIsStreaming(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await insforge.ai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: "你是一个专业的 HTML 学习助手，帮助用户学习 HTML 知识。" },
          ...messages,
          { role: "user", content: userMessage },
        ],
        stream: true,
      });

      let assistantMessage = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || "";
        assistantMessage += content;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: "assistant", content: assistantMessage };
          return newMessages;
        });
      }
    } catch (error: any) {
      setIsError(true);
      if (error.message && error.message.includes("Model not enabled")) {
        setMessage("模型未启用，请检查模型前缀是否为 openai/，并确保已正确配置模型。");
      } else {
        setMessage(error.message || "发生错误");
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleTagClick = (tagName: string) => {
    setChatInput(`请详细讲解一下 HTML 的 <${tagName}> 标签`);
  };

  const loadMasteredTags = async () => {
    try {
      const { data } = await insforge.database.from("tags").select("tag_name");
      if (data) {
        setMasteredTags(data.map((item: any) => item.tag_name));
      }
    } catch (error) {
      console.error("加载已掌握标签失败：", error);
    }
  };

  const handleMasterTag = async (tagName: string) => {
    if (masteredTags.includes(tagName)) return;
    try {
      await insforge.database.from("tags").insert({ tag_name: tagName });
      setMasteredTags((prev) => [...prev, tagName]);
      setMessage(`已掌握 <${tagName}> 标签！`);
    } catch (error) {
      console.error("保存标签失败：", error);
      setIsError(true);
      setMessage("保存失败，请确保已创建 tags 表");
    }
  };

  if (view === "auth") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">
            HTML AI 学习助手
          </h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-slate-300 mb-2">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {message && (
              <div className={`p-3 rounded-lg ${isError ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"}`}>
                {message}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              {isRegister ? "注册" : "登录"}
            </button>
          </form>
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setMessage("");
              setIsError(false);
            }}
            className="w-full mt-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            {isRegister ? "已有账号？立即登录" : "没有账号？立即注册"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800 p-4 flex items-center justify-between shadow-lg">
        <h1 className="text-2xl font-bold text-white">HTML AI 学习助手</h1>
        <div className="flex items-center gap-4">
          <span className="text-slate-300">欢迎，{user?.email}</span>
          <button
            onClick={testConnection}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            测试连接
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            退出登录
          </button>
        </div>
      </header>

      {message && (
        <div className={`p-4 ${isError ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"} text-center`}>
          {message}
        </div>
      )}

      <div className="p-4 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-4">HTML 标签学习</h2>
          <div className="flex flex-wrap gap-2">
            {HTML_TAGS.map((tag) => (
              <div key={tag.name} className="flex items-center gap-2">
                <button
                  onClick={() => handleTagClick(tag.name)}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <span className="font-mono text-yellow-400">&lt;{tag.name}&gt;</span>
                  <span className="text-sm text-slate-300">{tag.description}</span>
                </button>
                <button
                  onClick={() => handleMasterTag(tag.name)}
                  disabled={masteredTags.includes(tag.name)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    masteredTags.includes(tag.name)
                      ? "bg-green-600 text-white cursor-default"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {masteredTags.includes(tag.name) ? "已掌握" : "掌握"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-4">
        <div className="flex-1 overflow-y-auto bg-slate-800/30 rounded-xl p-4 mb-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-slate-400 text-lg">
                你好！我是你的 HTML 助手，点击上方标签或直接提问开始学习。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-xl ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 text-slate-100 p-4 rounded-xl">
                    <span className="animate-pulse">...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="输入你的问题..."
            className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isStreaming}
          />
          <button
            onClick={handleSendMessage}
            disabled={isStreaming || !chatInput.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
