import { Link } from "react-router-dom";

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

function ProjectCard({ project }) {
  return (
    <Link to={`/projects/${project.slug}`} className="pj-card">
      <div className="pj-card-top">
        <span className={`pj-difficulty pj-difficulty-${project.difficulty.toLowerCase()}`}>
          {project.difficulty}
        </span>
        <span className="pj-category">{project.category}</span>
      </div>

      <h3>{project.title}</h3>
      <p>{project.shortDescription}</p>

      <div className="pj-card-foot">
        <span className="pj-started">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {compact(project.startedCount || 0)} started
        </span>
        {project.solutionCount > 0 && (
          <span className="pj-solutions">{project.solutionCount} solutions</span>
        )}
      </div>
    </Link>
  );
}

export default ProjectCard;
