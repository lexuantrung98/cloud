using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectService.Data;
using ProjectService.Models;

namespace ProjectService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GroupMilestonesController : ControllerBase
{
    private readonly ProjectDbContext _context;

    public GroupMilestonesController(ProjectDbContext context)
    {
        _context = context;
    }

    // GET: api/GroupMilestones/group/{groupId}
    [HttpGet("group/{groupId}")]
    public async Task<ActionResult<IEnumerable<GroupMilestone>>> GetGroupMilestones(string groupId)
    {
        var milestones = await _context.GroupMilestones
            .AsNoTracking()
            .Where(m => m.GroupId == groupId)
            .OrderBy(m => m.Deadline)
            .ThenBy(m => m.CreatedAt)
            .ToListAsync();

        return Ok(milestones);
    }

    // GET: api/GroupMilestones/project/{projectTemplateId}
    [HttpGet("project/{projectTemplateId}")]
    public async Task<ActionResult<IEnumerable<GroupMilestone>>> GetMilestonesByProject(string projectTemplateId)
    {
        // Parse projectTemplateId to Guid
        if (!Guid.TryParse(projectTemplateId, out var projectId))
        {
            return BadRequest("Invalid project ID");
        }

        // Step 1: Get all group IDs for this project
        var groupIds = await _context.ProjectGroups
            .AsNoTracking()
            .Where(g => g.ProjectTemplateId == projectId)
            .Select(g => g.Id.ToString())
            .ToListAsync();

        if (!groupIds.Any())
        {
            return Ok(new List<GroupMilestone>());
        }

        // Step 2: Get milestones for these groups
        var milestones = await _context.GroupMilestones
            .AsNoTracking()
            .Where(m => groupIds.Contains(m.GroupId))
            .OrderBy(m => m.GroupId)
            .ThenBy(m => m.CreatedAt)
            .ToListAsync();

        return Ok(milestones);
    }

    // POST: api/GroupMilestones
    [HttpPost]
    public async Task<ActionResult<GroupMilestone>> CreateGroupMilestone(CreateGroupMilestoneDto dto)
    {
        var milestone = new GroupMilestone
        {
            Id = Guid.NewGuid().ToString(),
            GroupId = dto.GroupId,
            Title = dto.Title,
            Description = dto.Description ?? string.Empty,
            Deadline = dto.Deadline,
            AssignedTo = dto.AssignedTo,
            IsCompleted = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.GroupMilestones.Add(milestone);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetGroupMilestones), new { groupId = milestone.GroupId }, milestone);
    }

    // PATCH: api/GroupMilestones/{id}/toggle
    [HttpPatch("{id}/toggle")]
    public async Task<IActionResult> ToggleMilestone(string id, [FromBody] ToggleMilestoneDto dto)
    {
        var milestone = await _context.GroupMilestones.FindAsync(id);
        if (milestone == null) return NotFound();

        milestone.IsCompleted = dto.IsCompleted;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/GroupMilestones/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGroupMilestone(string id)
    {
        var milestone = await _context.GroupMilestones.FindAsync(id);
        if (milestone == null) return NotFound();

        _context.GroupMilestones.Remove(milestone);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // PATCH: api/GroupMilestones/{id}/assign
    [HttpPatch("{id}/assign")]
    public async Task<IActionResult> AssignMilestone(string id, [FromBody] AssignMilestoneDto dto)
    {
        var milestone = await _context.GroupMilestones.FindAsync(id);
        if (milestone == null) return NotFound();

        milestone.AssignedTo = dto.AssignedTo;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // POST: api/GroupMilestones/{id}/submit
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> SubmitMilestone(string id, [FromForm] SubmitMilestoneFormDto dto)
    {
        var milestone = await _context.GroupMilestones.FindAsync(id);
        if (milestone == null) return NotFound();

        milestone.SubmittedBy = dto.SubmittedBy;
        milestone.SubmissionContent = dto.SubmissionContent;
        milestone.SubmittedAt = DateTime.UtcNow;
        milestone.IsCompleted = true; // Auto complete when submitted

        // Handle file upload if provided
        if (dto.File != null && dto.File.Length > 0)
        {
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "milestones");
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid()}_{dto.File.FileName}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await dto.File.CopyToAsync(stream);
            }

            milestone.SubmissionFilePath = $"/uploads/milestones/{fileName}";
        }

        await _context.SaveChangesAsync();

        return Ok(milestone);
    }

    // POST: api/GroupMilestones/{id}/comments
    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(string id, [FromBody] DTOs.AddCommentDto dto)
    {
        var milestone = await _context.GroupMilestones.FindAsync(id);
        if (milestone == null) return NotFound();

        var userId = User.FindFirst("sub")?.Value ?? User.Identity?.Name ?? "Anonymous";
        
        var comment = new GroupMilestoneComment
        {
            Id = Guid.NewGuid().ToString(),
            GroupMilestoneId = id,
            UserId = userId,
            UserName = dto.UserName,
            UserRole = "Student",
            Content = dto.Content,
            CreatedAt = DateTime.UtcNow
        };

        _context.GroupMilestoneComments.Add(comment);
        await _context.SaveChangesAsync();

        return Ok(comment);
    }

    // GET: api/GroupMilestones/{id}/comments
    [HttpGet("{id}/comments")]
    public async Task<IActionResult> GetComments(string id)
    {
        var comments = await _context.GroupMilestoneComments
            .Where(c => c.GroupMilestoneId == id)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return Ok(comments);
    }

    // POST: api/GroupMilestones/{id}/grade
    [HttpPost("{id}/grade")]
    public async Task<IActionResult> GradeMilestone(string id, [FromBody] DTOs.GradeMilestoneDto dto)
    {
        // Try multiple claim types to find userId
        var userId = User.FindFirst("sub")?.Value
                  ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("userId")?.Value
                  ?? User.FindFirst("id")?.Value
                  ?? User.Identity?.Name
                  ?? "Anonymous";

        // DEBUG: Log all claims to see what's available
        Console.WriteLine($"[DEBUG] Grade from user: {userId}");
        Console.WriteLine($"[DEBUG] All claims:");
        foreach (var claim in User.Claims)
        {
            Console.WriteLine($"  - {claim.Type}: {claim.Value}");
        }

        var existingGrade = await _context.GroupMilestoneGrades
            .FirstOrDefaultAsync(g => g.GroupMilestoneId == id && g.GradedBy == userId);

        if (existingGrade != null)
        {
            existingGrade.Score = dto.Score;
            existingGrade.Feedback = dto.Feedback;
            existingGrade.GradedAt = DateTime.UtcNow;
        }
        else
        {
            var grade = new GroupMilestoneGrade
            {
                Id = Guid.NewGuid().ToString(),
                GroupMilestoneId = id,
                GradedBy = userId,
                GraderName = dto.GraderName,
                GraderRole = "Student",
                Score = dto.Score,
                Feedback = dto.Feedback,
                GradedAt = DateTime.UtcNow
            };
            _context.GroupMilestoneGrades.Add(grade);
        }

        await _context.SaveChangesAsync();
        return Ok();
    }

    // GET: api/GroupMilestones/{id}/grades
    [HttpGet("{id}/grades")]
    public async Task<IActionResult> GetGrades(string id)
    {
        var grades = await _context.GroupMilestoneGrades
            .Where(g => g.GroupMilestoneId == id)
            .OrderBy(g => g.GradedAt)
            .ToListAsync();

        var peerGrades = grades.Where(g => g.GraderRole == "Student").ToList();
        var avgPeerGrade = peerGrades.Any() ? peerGrades.Average(g => g.Score) : (double?)null;

        var lecturerGrade = grades.FirstOrDefault(g => g.GraderRole == "Lecturer");

        return Ok(new
        {
            allGrades = grades,
            averagePeerGrade = avgPeerGrade,
            lecturerGrade = lecturerGrade
        });
    }
}

public record CreateGroupMilestoneDto(string GroupId, string Title, string? Description, DateTime? Deadline, string? AssignedTo);
public record ToggleMilestoneDto(bool IsCompleted);
public record AssignMilestoneDto(string? AssignedTo);
public record SubmitMilestoneFormDto(string SubmittedBy, string? SubmissionContent, IFormFile? File);
