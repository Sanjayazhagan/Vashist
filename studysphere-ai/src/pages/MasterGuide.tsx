import { BookOpen, Coins, Users, FileText, MessageSquare, Zap } from "lucide-react";

export default function MasterGuide() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <article className="prose prose-slate dark:prose-invert max-w-none">
        <div className="flex items-center gap-3 mb-8 not-prose">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground m-0">Master Guide</h1>
            <p className="text-muted-foreground text-sm m-0">Everything you need to know about PoolNotes</p>
          </div>
        </div>

        <section className="space-y-6">
          <div className="p-6 rounded-xl bg-card border border-border">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2 mt-0">
              <Zap className="h-5 w-5 text-accent" /> What is PoolNotes?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              PoolNotes is an AI-powered collaborative study platform. Students form <strong>Pools</strong> (study groups),
              share high-quality notes, and earn <strong>Tokens</strong> that unlock AI-powered chat sessions. Think of it
              as a knowledge marketplace where everyone benefits from contributing.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2 mt-0">
              <Coins className="h-5 w-5 text-token" /> The Token Economy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Tokens are the currency of PoolNotes. Here's how they work:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li><strong>Earning Tokens:</strong> Upload notes to any Pool. Our AI grades your notes on clarity, completeness, and accuracy. Higher-quality notes earn more tokens (typically 5–10 per upload).</li>
              <li><strong>Spending Tokens:</strong> Each question you ask the AI costs <strong>1 token</strong>. The AI draws from all notes shared in that Pool's knowledge base.</li>
              <li><strong>Quality Incentive:</strong> Better notes = more tokens = more AI access. This creates a virtuous cycle of knowledge sharing.</li>
            </ul>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2 mt-0">
              <Users className="h-5 w-5 text-primary" /> Pools (Study Groups)
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Pools are the heart of PoolNotes. Each Pool is a focused study community:
            </p>
            <ul className="text-muted-foreground space-y-2">
              <li><strong>Create a Pool</strong> for any course, topic, or study group</li>
              <li><strong>Share a Join Code</strong> with classmates to invite them</li>
              <li><strong>Upload notes</strong> to build the Pool's collective knowledge base</li>
              <li><strong>Chat with AI</strong> that understands everything in your Pool's notes</li>
            </ul>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2 mt-0">
              <FileText className="h-5 w-5 text-success" /> Uploading Notes
            </h2>
            <blockquote className="border-l-4 border-primary bg-primary/5 p-4 rounded-r-lg italic text-muted-foreground">
              "The quality of AI responses is directly proportional to the quality of shared notes."
            </blockquote>
            <p className="text-muted-foreground leading-relaxed">
              Tips for high-scoring notes:
            </p>
            <ul className="text-muted-foreground space-y-1">
              <li>Use clear headings and structure</li>
              <li>Include definitions, examples, and diagrams descriptions</li>
              <li>Cover complete topics rather than fragments</li>
              <li>Proofread for accuracy</li>
            </ul>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2 mt-0">
              <MessageSquare className="h-5 w-5 text-accent" /> AI Chat
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The AI assistant has access to every note shared in a Pool. Ask it anything — from concept explanations
              to practice questions to study strategies. Each conversation is saved so you can review past sessions.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Pro tip:</strong> Be specific with your questions. Instead of "explain chemistry," try
              "compare SN1 and SN2 reaction mechanisms with examples."
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}
