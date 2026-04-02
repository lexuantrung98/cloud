using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ProjectService.Models;
using ProjectService.Data;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace ProjectService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // All operations require authentication
    public class ProjectSubmissionsController : ControllerBase
    {
        private readonly ProjectDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public ProjectSubmissionsController(ProjectDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        [HttpGet("project/{projectId}")]
        public async Task<IActionResult> GetSubmissionsByProject(Guid projectId)
        {
            if (_context.ProjectSubmissions == null) 
                return NotFound("Bảng ProjectSubmissions chưa được khởi tạo.");

            var submissions = await _context.ProjectSubmissions
                .AsNoTracking() // Tối ưu performance
                .Include(s => s.Group)
                    .ThenInclude(g => g!.Members)
                .Include(s => s.ProjectMilestone)
                .Where(s => s.Group != null && s.Group.ProjectTemplateId == projectId)
                .OrderByDescending(s => s.SubmittedAt)
                .ToListAsync();

            return Ok(submissions);
        }

        [HttpGet("project/{projectId}/team/{teamId}")]
        public async Task<IActionResult> GetTeamSubmissions(Guid projectId, Guid teamId)
        {
            var submissions = await _context.ProjectSubmissions
                .Include(s => s.ProjectMilestone)
                .Where(s => s.ProjectMilestone!.ProjectTemplateId == projectId && s.ProjectGroupId == teamId)
                .ToListAsync();
            return Ok(submissions);
        }

        [HttpPut("{id}/grade")]
        [Authorize(Roles = "Lecturer,Admin")] // Only lecturers can grade
        public async Task<IActionResult> GradeSubmission(Guid id, [FromBody] GradeRequest request)
        {
            var submission = await _context.ProjectSubmissions.FindAsync(id);
            if (submission == null) return NotFound("Không tìm thấy bài nộp.");

            submission.Grade = request.Grade;
            submission.Feedback = request.Feedback;
            submission.GradedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(submission);
        }

        [HttpPost("submit-work")]
        public async Task<IActionResult> SubmitWork([FromForm] SubmitWorkRequest request)
        {
           
            var submission = await _context.ProjectSubmissions
                .FirstOrDefaultAsync(s => s.ProjectGroupId == request.TeamId && s.ProjectMilestoneId == request.MilestoneId);

            if (submission == null)
            {
                submission = new ProjectSubmission
                {
                    Id = Guid.NewGuid(),
                    ProjectGroupId = request.TeamId,
                    ProjectMilestoneId = request.MilestoneId,
                    SubmittedAt = DateTime.UtcNow
                };
                _context.ProjectSubmissions.Add(submission);
            }
            else
            {
              
                submission.SubmittedAt = DateTime.UtcNow;
            }

           
            submission.Description = request.Description;

            if (request.File != null)
            {
                // FIX: WebRootPath already points to wwwroot/, don't add "wwwroot" again
                string uploadsFolder = Path.Combine(
                    _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
                    "uploads", 
                    "submissions");
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                string uniqueFileName = Guid.NewGuid().ToString() + "_" + request.File.FileName;
                string filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await request.File.CopyToAsync(fileStream);
                }
                
                submission.Content = "/uploads/submissions/" + uniqueFileName; 
            }
            else if (!string.IsNullOrEmpty(request.Content))
            {
                submission.Content = request.Content;
            }

            await _context.SaveChangesAsync();
            return Ok(submission);
        }
    }

    public class GradeRequest
    {
        public double Grade { get; set; }
        public string Feedback { get; set; } = string.Empty;
    }

    public class SubmitWorkRequest
    {
        public Guid ProjectId { get; set; } 
        public Guid TeamId { get; set; }
        public Guid MilestoneId { get; set; }
        public string? Content { get; set; }
        public string? Description { get; set; }
        public IFormFile? File { get; set; }
    }
}
