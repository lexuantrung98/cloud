using System.ComponentModel.DataAnnotations;

namespace ProjectService.Models;

public class ProjectGroupMember
{
    public Guid Id { get; set; }
    public Guid ProjectGroupId { get; set; }
    
    /// <summary>
    /// Link to AccountService User.Id (GUID)
    /// </summary>
    [Required]
    public Guid UserId { get; set; }
    
    /// <summary>
    /// Mã sinh viên (VD: SV000001) - cached from AccountService User.Code
    /// </summary>
    [Required]
    public string StudentCode { get; set; } = string.Empty;
    
    public string FullName { get; set; } = string.Empty;  
    public string Role { get; set; } = "Member";

    public ProjectGroup? Group { get; set; }
}
