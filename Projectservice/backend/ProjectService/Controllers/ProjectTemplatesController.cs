using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ProjectService.Models;
using ProjectService.Enums;
using ProjectService.Data;

namespace ProjectService.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize] // Authentication required
public class ProjectTemplatesController : ControllerBase
{
    private readonly ProjectDbContext _context;

    public ProjectTemplatesController(ProjectDbContext context)
    {
        _context = context;
    }

    public class MilestoneDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int OrderIndex { get; set; }
        public DateTime? Deadline { get; set; }
        public List<string> Questions { get; set; } = new(); 
    }

    public class CreateProjectRequest
    {
        public string SubjectId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime? Deadline { get; set; }
        public List<MilestoneDto> Milestones { get; set; } = new();
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectTemplate>>> GetProjectTemplates()
    {
        return await _context.ProjectTemplates
            .Include(p => p.Milestones)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectTemplate>> GetProjectById(Guid id)
    {
        var project = await _context.ProjectTemplates
            .Include(p => p.Milestones)
            .FirstOrDefaultAsync(p => p.Id == id);
        
        if (project == null) return NotFound();
        return Ok(project);
    }

    [HttpPost]
    [Authorize(Roles = "Lecturer,Admin")] // Only lecturers can create projects
    public async Task<ActionResult<ProjectTemplate>> CreateProjectTemplate([FromBody] CreateProjectRequest request)
    {
        try 
        {
            var project = new ProjectTemplate
            {
                Id = Guid.NewGuid(),
                SubjectId = request.SubjectId,
                Name = request.Name,
                Description = request.Description,
                Deadline = request.Deadline,
                CreatedAt = DateTime.UtcNow,
                Status = 0,
                
                Milestones = request.Milestones.Select(m => new ProjectMilestone
                {
                    Id = Guid.NewGuid(),
                    Title = m.Title,
                    Description = m.Description,
                    OrderIndex = m.OrderIndex,
                    Deadline = m.Deadline,
                    Questions = m.Questions.Select(q => new MilestoneQuestion 
                    {
                        Id = Guid.NewGuid(),
                        Question = q
                    }).ToList()
                }).ToList()
            };

            _context.ProjectTemplates.Add(project);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProjectTemplates), new { id = project.Id }, project);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = ex.Message });
        }
    }

    [HttpPut("{id}/status")]
    [Authorize(Roles = "Admin,HeadDepartment")] // Admin and Head Department can approve/reject
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] int status)
    {
        var project = await _context.ProjectTemplates.FindAsync(id);
        if (project == null) return NotFound();
        project.Status = (ProjectStatus)status;

        if (project.Status == ProjectStatus.Approved) 
            project.ApprovedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Success" });
    }

    [HttpPut("{id}/assign")]
    public async Task<IActionResult> AssignClass(Guid id, [FromBody] string classId)
    {
        var project = await _context.ProjectTemplates.FindAsync(id);
        if (project == null) return NotFound();

        if (string.IsNullOrEmpty(project.AssignedClassIds))
        {
            project.AssignedClassIds = classId;
        }
        else
        {
            var classes = project.AssignedClassIds.Split(',').ToList();
            if (!classes.Contains(classId))
            {
                project.AssignedClassIds += "," + classId;
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Success", assignedClasses = project.AssignedClassIds });
    }
}
