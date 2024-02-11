import attachmentInterface from '../interfaces/SAPAttachment';
import {logger} from "../util/logger";
class AttachmentController {

    public async update(files:any ,sapConfig:any) {
        let result:any = {};
        try {
            
            let updateAttachment = new attachmentInterface(sapConfig);
            let xml = await updateAttachment.updateAttachments(files);
            let newXML = updateAttachment.replaceSapVersion(xml);
            updateAttachment.body = newXML;
            updateAttachment.setOptions();
            let response = await updateAttachment.call();
        }catch (e) {
            logger.error("AttachmentController-> update->", e);
            result = {
                status: 0,
                data: "",
                message: "no se logro conseguir el id de los archivos"
            };
        }
        return result;
    }
}

const attachmentController = new AttachmentController();
export default attachmentController;