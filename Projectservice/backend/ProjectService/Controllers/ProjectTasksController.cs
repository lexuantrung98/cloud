using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ProjectService.Models;
using ProjectService.Data;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace ProjectService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // All task operations require authentication
    public class ProjectTasksController : ControllerBase
    {
        private readonly ProjectDbContext _context;

        public ProjectTasksController(ProjectDbContext context)
        {
            _context = context;
        }

        [HttpGet("group/{groupId}")]
        public async Task<IActionResult> GetTasksByGroup(Guid groupId)
        {
            var tasks = await _context.ProjectTasks
                .Include(t => t.SubTasks)
                .Include(t => t.Comments)
                .Where(t => t.ProjectGroupId == groupId && !t.IsDeleted) // Filter deleted
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
            return Ok(tasks);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTask([FromBody] CreateTaskRequest request)
        {
            var task = new ProjectTask
            {
                Id = Guid.NewGuid(),
                Title = request.Title,
                Description = request.Description,
                Priority = request.Priority,
                Deadline = request.Deadline,
                ProjectGroupId = request.GroupId,
                AssignedToUserId = request.AssignedTo,
                Status = 0,
                CreatedAt = DateTime.UtcNow
            };

            _context.ProjectTasks.Add(task);
            await _context.SaveChangesAsync();
            return Ok(task);
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] int newStatus)
        {
            var task = await _context.ProjectTasks.FindAsync(id);
            if (task == null) return NotFound();

            task.Status = newStatus;
            await _context.SaveChangesAsync();
            return Ok(task);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(Guid id)
        {
            var task = await _context.ProjectTasks.FindAsync(id);
            if (task == null || task.IsDeleted) return NotFound();

            // Soft delete instead of hard delete
            task.IsDeleted = true;
            task.DeletedAt = DateTime.UtcNow;
            // Get current user from claims if available
            task.DeletedBy = User.FindFirst("sub")?.Value ?? User.Identity?.Name;
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "Task deleted successfully" });
        }

        [HttpPost("{id}/comments")]
        public async Task<IActionResult> AddComment(Guid id, [FromBody] CreateCommentRequest req)
        {
            var comment = new TaskComment
            {
                Id = Guid.NewGuid(),
                ProjectTaskId = id,
                Content = req.Content,
                CreatedByUserId = req.UserId,
                CreatedAt = DateTime.UtcNow
            };
            _context.TaskComments.Add(comment);
            await _context.SaveChangesAsync();
            return Ok(comment);
        }

        [HttpPost("{id}/subtasks")]
        public async Task<IActionResult> AddSubTask(Guid id, [FromBody] SubTaskRequest req)
        {
            var sub = new TaskSubItem
            {
                Id = Guid.NewGuid(),
                ProjectTaskId = id,
                Content = req.Content,
                IsDone = false
            };
            _context.TaskSubItems.Add(sub);
            await _context.SaveChangesAsync();
            return Ok(sub);
        }

        [HttpPut("subtasks/{subId}/toggle")]
        public async Task<IActionResult> ToggleSubTask(Guid subId)
        {
            var sub = await _context.TaskSubItems.FindAsync(subId);
            if (sub == null) return NotFound();
            sub.IsDone = !sub.IsDone;
            await _context.SaveChangesAsync();
            return Ok(sub);
        }
    }

    public class CreateTaskRequest
    {
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "GroupId is required")]
        public Guid GroupId { get; set; }
        
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Title is required")]
        [System.ComponentModel.DataAnnotations.MaxLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
        public string Title { get; set; } = string.Empty;
        
        [System.ComponentModel.DataAnnotations.MaxLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
        public string Description { get; set; } = string.Empty;
        
        [System.ComponentModel.DataAnnotations.Range(0, 5, ErrorMessage = "Priority must be between 0 and 5")]
        public int Priority { get; set; }
        
        public DateTime? Deadline { get; set; }
        public string? AssignedTo { get; set; }
    }

    public class CreateCommentRequest 
    { 
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Content is required")]
        [System.ComponentModel.DataAnnotations.MaxLength(2000, ErrorMessage = "Content cannot exceed 2000 characters")]
        public string Content { get; set; } = string.Empty;
        
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "UserId is required")]
        public string UserId { get; set; } = string.Empty;
    }

    public class SubTaskRequest
    {
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Content is required")]
        [System.ComponentModel.DataAnnotations.MaxLength(500, ErrorMessage = "Content cannot exceed 500 characters")]
        public string Content { get; set; } = string.Empty;
    }
}
