import type { GroupButtonPayload } from '@pexip/plugin-api'
import { ButtonId } from './ButtonId'
import { config } from '../../config'

const videosPopUpId = ''
const url = config.vbrick.url + '/#/media/uploads?sortField=whenUploaded'
const opts = 'toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0,width=800,height=600,left=250,top=250'

export const VideosButtonPayload: GroupButtonPayload = {
  id: ButtonId.Videos,
  position: 'toolbar',
  icon: 'IconOpenInNew',
  tooltip: 'Manage recordings',
  roles: ['chair'],
  opensPopup: {
    id: videosPopUpId,
    openParams: [url, '', opts]
  }
}
