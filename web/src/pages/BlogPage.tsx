import { Link, Navigate, useParams } from 'react-router-dom';
import { Badge, ButtonLink, Card, Chip, LogoMark } from '../components/Primitives';
import { blogPosts, getBlogPost, type BlogBlock, type BlogPost } from '../data/blogPosts';
import { Footer } from './LandingPage';

function BlogNav() {
  return (
    <header className="landing-nav">
      <div className="landing-container marketing-nav">
        <Link to="/" className="sidebar-brand">
          <LogoMark size={22} />
          <span style={{ fontWeight: 650, fontSize: 15 }}>StackCert</span>
        </Link>
        <nav className="marketing-nav-links">
          <Link to="/why-stackcert">Why</Link>
          <Link to="/how-it-works">How it works</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/docs">Docs</Link>
          <Link to="/security">Security</Link>
        </nav>
        <div style={{ flex: 1 }} />
        <ButtonLink to="/onboarding" variant="primary">
          Start pilot
        </ButtonLink>
      </div>
    </header>
  );
}

export function BlogIndexPage() {
  const [featured, ...remaining] = blogPosts;
  return (
    <div className="landing marketing-shell">
      <BlogNav />
      <main className="blog-index">
        <section className="blog-hero">
          <div className="landing-container blog-hero-grid">
            <div>
              <Badge tone="neutral">StackCert blog</Badge>
              <h1>Evidence-backed safety decisions for production LLM apps.</h1>
              <p>
                A research and product series on why safety checks should be selected as combinations, how CASS
                targets the measurements that matter, and what our current empirical results do and do not support.
              </p>
              <div className="blog-hero-actions">
                <ButtonLink to={`/blog/${featured.slug}`} variant="primary">
                  Read the overview
                </ButtonLink>
                <ButtonLink to="/demo">Open demo</ButtonLink>
              </div>
            </div>
            <Card>
              <div className="blog-featured-label">Featured series</div>
              <h2>{featured.title}</h2>
              <p>{featured.dek}</p>
              <div className="blog-meta-row">
                <Chip>{featured.category}</Chip>
                <span>{featured.readTime}</span>
              </div>
              <Link className="blog-card-link" to={`/blog/${featured.slug}`}>
                Continue reading
              </Link>
            </Card>
          </div>
        </section>

        <section className="blog-series-section">
          <div className="landing-container">
            <div className="blog-section-head">
              <div>
                <div className="section-eyebrow">The series</div>
                <h2 className="section-title">From product problem to empirical evidence.</h2>
              </div>
              <p>
                The posts are ordered for readers moving from the buyer problem to the theory, method, and results.
                Each one includes the limits of the evidence it uses.
              </p>
            </div>
            <div className="blog-post-grid">
              {blogPosts.map((post) => (
                <BlogPostCard key={post.slug} post={post} />
              ))}
            </div>
          </div>
        </section>

        <section className="blog-cta-section">
          <div className="landing-container">
            <div className="blog-cta">
              <div>
                <h2>Want to compare this against your own safety checks?</h2>
                <p>
                  Start with the sample support-copilot demo, then bring one real workflow and a candidate set from your
                  own app.
                </p>
              </div>
              <ButtonLink to="/onboarding">Start pilot</ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <Link className="blog-post-card" to={`/blog/${post.slug}`}>
      <div className="blog-card-topline">
        <span className="mono">{post.number}</span>
        <span>{post.category}</span>
      </div>
      <h3>{post.title}</h3>
      <p>{post.summary}</p>
      <div className="blog-card-footer">
        <span>{post.readTime}</span>
        <span>Read post</span>
      </div>
    </Link>
  );
}

export function BlogPostPage() {
  const { postSlug } = useParams();
  const post = getBlogPost(postSlug);
  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const currentIndex = blogPosts.findIndex((candidate) => candidate.slug === post.slug);
  const nextPost = blogPosts[currentIndex + 1] ?? blogPosts[0];

  return (
    <div className="landing marketing-shell">
      <BlogNav />
      <main className="blog-post-page">
        <article className="blog-article">
          <header className="blog-article-head">
            <Link className="blog-back-link" to="/blog">
              Blog
            </Link>
            <div className="blog-article-meta">
              <Chip>{post.category}</Chip>
              <span>{post.date}</span>
              <span>{post.readTime}</span>
            </div>
            <h1>{post.title}</h1>
            <p>{post.dek}</p>
          </header>

          <div className="blog-article-layout">
            <aside className="blog-article-aside">
              <div className="blog-aside-card">
                <div className="stat-label">Audience</div>
                <p>{post.audience}</p>
              </div>
              <div className="blog-aside-card">
                <div className="stat-label">Main takeaway</div>
                <p>{post.takeaway}</p>
              </div>
              <div className="blog-aside-card">
                <Link to={`/blog/${nextPost.slug}`}>Next: {nextPost.title}</Link>
              </div>
            </aside>

            <div className="blog-article-body">
              {post.blocks.map((block, index) => (
                <BlogBlockView block={block} key={`${block.type}-${index}`} />
              ))}
              <div className="blog-next-card">
                <div>
                  <div className="section-eyebrow">Next in the series</div>
                  <h2>{nextPost.title}</h2>
                  <p>{nextPost.dek}</p>
                </div>
                <ButtonLink to={`/blog/${nextPost.slug}`}>Read next</ButtonLink>
              </div>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function BlogBlockView({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <p>{block.text}</p>;
    case 'heading':
      return <h2>{block.text}</h2>;
    case 'subheading':
      return <h3>{block.text}</h3>;
    case 'list':
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'quote':
      return <blockquote>{block.text}</blockquote>;
    case 'callout':
      return (
        <div className="blog-callout">
          <strong>{block.title}</strong>
          <p>{block.body}</p>
        </div>
      );
    case 'table':
      return (
        <div className="blog-table-block">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {block.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row) => (
                  <tr key={row.join('|')}>
                    {row.map((cell, index) => (
                      <td key={`${cell}-${index}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.note ? <p className="blog-table-note">{block.note}</p> : null}
        </div>
      );
    case 'figure':
      return (
        <figure className="blog-figure">
          <img src={block.src} alt={block.alt} />
          <figcaption>{block.caption}</figcaption>
        </figure>
      );
    case 'code':
      return (
        <pre className="blog-code">
          <code>{block.code}</code>
        </pre>
      );
    default:
      return null;
  }
}
