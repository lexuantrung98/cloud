using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ProjectService.Models;
using ProjectService.Data;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;

namespace ProjectService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Require authentication for all endpoints
    public class ProjectGroupsController : ControllerBase
    {
        private readonly ProjectDbContext _context;

        public ProjectGroupsController(ProjectDbContext context)
        {
            _context = context;
        }
        
        // Debug endpoint - get all groups with members
        [HttpGet("all")]
        [Authorize(Roles = "Lecturer,Admin")] // Only lecturers and admins
        public async Task<IActionResult> GetAllGroups()
        {
            var groups = await _context.ProjectGroups
                .Include(g => g.Members)
                .Include(g => g.ProjectTemplate)
                .ToListAsync();
            return Ok(groups);
        }
        
        // DELETE: api/ProjectGroups/by-course-group?classCode=CN2302A&groupName=Nhom1
        [HttpDelete("by-course-group")]
        [Authorize(Roles = "Lecturer,Admin")]
        public async Task<IActionResult> DeleteByCourseGroup([FromQuery] string classCode, [FromQuery] string groupName)
        {
            if (string.IsNullOrEmpty(classCode) || string.IsNullOrEmpty(groupName))
            {
                return BadRequest("ClassCode and GroupName are required");
            }

            // Find ProjectGroup by ClassId and Name
            var projectGroup = await _context.ProjectGroups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.ClassId == classCode && g.Name == groupName);

            if (projectGroup == null)
            {
                return NotFound($"ProjectGroup with ClassCode={classCode} and Name={groupName} not found");
            }

            // Remove all members first
            if (projectGroup.Members != null && projectGroup.Members.Count > 0)
            {
                _context.ProjectGroupMembers.RemoveRange(projectGroup.Members);
            }

            // Remove the group
            _context.ProjectGroups.Remove(projectGroup);
            await _context.SaveChangesAsync();

            return Ok(new { message = "ProjectGroup deleted successfully", classCode, groupName });
        }

        // DELETE: api/ProjectGroups/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "Lecturer,Admin")]
        public async Task<IActionResult> DeleteProjectGroup(Guid id)
        {
            var projectGroup = await _context.ProjectGroups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == id && !g.IsDeleted);

            if (projectGroup == null)
            {
                return NotFound($"ProjectGroup with ID {id} not found");
            }

            // Soft delete instead of hard delete
            projectGroup.IsDeleted = true;
            projectGroup.DeletedAt = DateTime.UtcNow;
            projectGroup.DeletedBy = User.FindFirst("sub")?.Value ?? User.Identity?.Name;
            
            await _context.SaveChangesAsync();

            return Ok(new { message = "ProjectGroup deleted successfully", id });
        }

        [HttpPut("{id}/assign-project")]
        public async Task<IActionResult> AssignGroupToProject(Guid id, [FromBody] AssignProjectRequest request)
        {
            var group = await _context.ProjectGroups.FindAsync(id);
            if (group == null || group.IsDeleted)
            {
                return NotFound($"ProjectGroup with ID {id} not found");
            }

            group.ProjectTemplateId = request.ProjectTemplateId;
            await _context.SaveChangesAsync();

            return Ok(new { message = "ProjectGroup assigned to project successfully", group });
        }

        [HttpGet("project/{projectId}")]
        public async Task<IActionResult> GetGroupsByProject(Guid projectId)
        {
            var groups = await _context.ProjectGroups
                .Include(g => g.Members)
                .Where(g => g.ProjectTemplateId == projectId && !g.IsDeleted)
                .ToListAsync();
            return Ok(groups);
        }
        [HttpGet("class/{classId}")]
        public async Task<IActionResult> GetGroupsByClass(string classId)
        {
            var groups = await _context.ProjectGroups
                .Include(g => g.Members)
                .Where(g => g.ClassId == classId && !g.IsDeleted)
                .ToListAsync();
            return Ok(groups);
        }
        [HttpPost]
        public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest request)
        {
            var group = new ProjectGroup
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                ProjectTemplateId = request.ProjectTemplateId,
                ClassId = request.ClassId,
                SubjectCode = request.SubjectCode,
                MaxMembers = request.MaxMembers > 0 ? request.MaxMembers : 5
            };

            _context.ProjectGroups.Add(group);
            await _context.SaveChangesAsync();
            return Ok(group);
        }

        [HttpPost("add-member")]
        public async Task<IActionResult> AddMember([FromBody] AddMemberRequest request)
        {
            // Check if group exists
            var group = await _context.ProjectGroups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == request.GroupId);
                
            if (group == null)
            {
                return NotFound($"Group with ID {request.GroupId} not found");
            }
            
            // Determine role: first member = Leader, others = Member
            var existingMembersCount = group.Members?.Count ?? 0;
            var role = existingMembersCount == 0 ? "Leader" : "Member";
            
            var member = new ProjectGroupMember
            {
                Id = Guid.NewGuid(),
                ProjectGroupId = request.GroupId,
                UserId = request.UserId,           // Lưu User ID (Guid)
                StudentCode = request.StudentId,    // Lưu mã sinh viên
                FullName = request.FullName,
                Role = role  // Auto-assign based on member count
            };

            _context.ProjectGroupMembers.Add(member);
            await _context.SaveChangesAsync();
            return Ok(member);
        }
        [HttpDelete("members/{id}")]
        public async Task<IActionResult> RemoveMember(Guid id)
        {
            var member = await _context.ProjectGroupMembers.FindAsync(id);
            if (member == null) return NotFound();

            _context.ProjectGroupMembers.Remove(member);
            await _context.SaveChangesAsync();
            return Ok();
        }

    
        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetGroupByStudent(string studentId)
        {
            // studentId ở đây thực chất là StudentCode (mã sinh viên VD: SV000001)
            // Get all groups that student is a member of
            var memberRecords = await _context.ProjectGroupMembers
                .Where(m => m.StudentCode == studentId)  // Tìm theo StudentCode
                .ToListAsync();

            if (memberRecords == null || memberRecords.Count == 0)
            {
                return NotFound("Sinh viên chưa tham gia nhóm nào.");
            }

            var groupIds = memberRecords.Select(m => m.ProjectGroupId).ToList();
            
            var groups = await _context.ProjectGroups
                .Include(g => g.Members) 
                .Include(g => g.ProjectTemplate) 
                .ThenInclude(t => t!.Milestones) 
                .Where(g => groupIds.Contains(g.Id))
                .ToListAsync();

            // Return ALL groups that student is a member of
            // Filter out soft-deleted groups
            var activeGroups = groups.Where(g => !g.IsDeleted).ToList();
            
            if (activeGroups.Count == 0)
            {
                return NotFound("Sinh viên chưa tham gia nhóm nào.");
            }
            
            // Return all groups (student can participate in multiple projects)
            return Ok(activeGroups);
        }
        
        // NEW: Create group with members in a single transaction
        [HttpPost("create-with-members")]
        [Authorize(Roles = "Lecturer,Admin")]
        public async Task<IActionResult> CreateGroupWithMembers([FromBody] CreateGroupWithMembersRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // Check if this group (ClassId + Name) is already assigned to this ProjectTemplate
                // IMPORTANT: Bỏ qua các nhóm đã bị soft delete (!g.IsDeleted)
                var existingGroup = await _context.ProjectGroups
                    .FirstOrDefaultAsync(g => 
                        g.ProjectTemplateId == request.ProjectTemplateId && 
                        g.ClassId == request.ClassId && 
                        g.Name == request.Name &&
                        !g.IsDeleted); // Bỏ qua nhóm đã xóa
                
                if (existingGroup != null)
                {
                    return BadRequest(new { 
                        message = $"Nhóm '{request.Name}' trong lớp '{request.ClassId}' đã được phân vào dự án này rồi. Không thể phân lại.",
                        error = "DUPLICATE_GROUP_ASSIGNMENT"
                    });
                }

                // Create the group
                var group = new ProjectGroup
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name,
                    ProjectTemplateId = request.ProjectTemplateId,
                    ClassId = request.ClassId
                };
                
                _context.ProjectGroups.Add(group);
                
                // Add all members
                if (request.Members != null && request.Members.Count > 0)
                {
                    foreach (var memberData in request.Members)
                    {
                        // Parse UserId from string to Guid (if provided)
                        Guid userId = Guid.Empty;
                        if (!string.IsNullOrEmpty(memberData.UserId))
                        {
                            Guid.TryParse(memberData.UserId, out userId);
                        }
                        
                        var member = new ProjectGroupMember
                        {
                            Id = Guid.NewGuid(),
                            ProjectGroupId = group.Id,
                            UserId = userId,                      // Parsed Guid
                            StudentCode = memberData.StudentId,  // Lưu mã sinh viên
                            FullName = memberData.FullName,
                            Role = memberData.Role ?? "Member"
                        };
                        _context.ProjectGroupMembers.Add(member);
                    }
                }
                
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                
                // Return group with members
                var result = await _context.ProjectGroups
                    .Include(g => g.Members)
                    .FirstOrDefaultAsync(g => g.Id == group.Id);
                    
                return Ok(result);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Error creating group: {ex.Message}");
            }
        }
        
        // POST: api/ProjectGroups/{groupId}/final-grade - Save final grade
        [HttpPost("{groupId}/final-grade")]
        [Authorize(Roles = "Lecturer,Admin")]
        public async Task<IActionResult> SaveFinalGrade(Guid groupId, [FromBody] SaveFinalGradeRequest request)
        {
            var group = await _context.ProjectGroups
                .FirstOrDefaultAsync(g => g.Id == groupId && !g.IsDeleted);
                
            if (group == null)
            {
                return NotFound($"Group with ID {groupId} not found");
            }
            
            // Update final grade fields
            group.FinalGrade = request.Grade;
            group.FinalGradeFeedback = request.Feedback?.Trim();
            group.FinalGradedAt = DateTime.UtcNow;
            group.FinalGradedBy = User.FindFirst("sub")?.Value ?? User.Identity?.Name ?? request.LecturerId;
            
            await _context.SaveChangesAsync();
            
            return Ok(new FinalGradeResponse
            {
                Grade = group.FinalGrade.Value,
                Feedback = group.FinalGradeFeedback,
                GradedAt = group.FinalGradedAt.Value,
                GradedBy = group.FinalGradedBy ?? "Unknown"
            });
        }
        
        // GET: api/ProjectGroups/{groupId}/final-grade - Get final grade
        [HttpGet("{groupId}/final-grade")]
        public async Task<IActionResult> GetFinalGrade(Guid groupId)
        {
            var group = await _context.ProjectGroups
                .FirstOrDefaultAsync(g => g.Id == groupId && !g.IsDeleted);
                
            if (group == null)
            {
                return NotFound($"Group with ID {groupId} not found");
            }
            
            if (!group.FinalGrade.HasValue)
            {
                return NotFound("This group has not been graded yet");
            }
            
            return Ok(new FinalGradeResponse
            {
                Grade = group.FinalGrade.Value,
                Feedback = group.FinalGradeFeedback,
                GradedAt = group.FinalGradedAt!.Value,
                GradedBy = group.FinalGradedBy ?? "Unknown"
            });
        }
    }

    public class CreateGroupRequest
    {
        public Guid? ProjectTemplateId { get; set; } // Nullable
        public string Name { get; set; } = string.Empty;
        public string ClassId { get; set; } = string.Empty;
        public string? SubjectCode { get; set; } // Mã môn học
        public int MaxMembers { get; set; } = 5; // Số lượng thành viên tối đa
    }

    public class AddMemberRequest
    {
        public Guid GroupId { get; set; }
        public Guid UserId { get; set; }        // User ID từ AccountService
        public string StudentId { get; set; } = string.Empty;  // Mã sinh viên
        public string FullName { get; set; } = string.Empty;
    }
    
    // NEW: Request DTO for batch create
    public class CreateGroupWithMembersRequest
    {
        [Required(ErrorMessage = "Name is required")]
        [MaxLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
        public string Name { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "ProjectTemplateId is required")]
        public Guid ProjectTemplateId { get; set; }
        
        [Required(ErrorMessage = "ClassId is required")]
        [MaxLength(20, ErrorMessage = "ClassId cannot exceed 20 characters")]
        public string ClassId { get; set; } = string.Empty;
        
        public List<MemberDto> Members { get; set; } = new();
    }
    
    public class MemberDto
    {
        public string? UserId { get; set; }
        
        [Required(ErrorMessage = "StudentId is required")]
        [MaxLength(20, ErrorMessage = "StudentId cannot exceed 20 characters")]
        public string StudentId { get; set; } = string.Empty;
        
        [Required(ErrorMessage = "FullName is required")]
        [MaxLength(100, ErrorMessage = "FullName cannot exceed 100 characters")]
        public string FullName { get; set; } = string.Empty;
        
        public string? Role { get; set; }
    }

    public class AssignProjectRequest
    {
        public Guid ProjectTemplateId { get; set; }
    }
    
    public class SaveFinalGradeRequest
    {
        [Required(ErrorMessage = "Grade is required")]
        [Range(0, 10, ErrorMessage = "Grade must be between 0 and 10")]
        public decimal Grade { get; set; }
        
        public string? Feedback { get; set; }
        
        [Required(ErrorMessage = "LecturerId is required")]
        public string LecturerId { get; set; } = string.Empty;
    }
    
    public class FinalGradeResponse
    {
        public decimal Grade { get; set; }
        public string? Feedback { get; set; }
        public DateTime GradedAt { get; set; }
        public string GradedBy { get; set; } = string.Empty;
    }
}
